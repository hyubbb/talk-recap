"use client";

import { useSetAtom, useStore } from "jotai";
import { useMutation } from "@tanstack/react-query";
import { analysisAtom, type ChunkRun } from "@/state/analysis";
import { groupsAtom, rangeAtom, statsAtom } from "@/state/upload";
import { periodLabel, statsDigest } from "@/lib/report/digest";
import { newReportId, saveReport } from "@/lib/report/storage";
import { memberColor } from "@/lib/ui/colors";
import type { ChunkNotes, Report } from "@/lib/llm/schema";
import type { ChunkText, DateRange } from "@/workers/protocol";
import type { MemberGroup } from "@/lib/kakao/members";

const CONCURRENCY = 3;
const MAX_TRIES = 3;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `요청 실패 (${res.status})`);
  return json as T;
}

const md = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

/**
 * 구간 분석을 병렬로 돌리고(동시 3개, 실패 시 최대 3번), 끝나면 종합해서 저장한다.
 */
export function useRunAnalysis(
  chunkTexts: (groups: MemberGroup[], range: DateRange | null) => Promise<ChunkText[]>,
) {
  const store = useStore();
  const setState = useSetAtom(analysisAtom);

  return useMutation({
    mutationFn: async () => {
      const groups = store.get(groupsAtom);
      const stats = store.get(statsAtom)!;
      const people = groups.filter((g) => !g.isBot);
      const names = people.map((g) => g.displayName);
      const texts = await chunkTexts(groups, store.get(rangeAtom));

      let runs: ChunkRun[] = texts.map((t) => ({
        index: t.index, start: t.start, end: t.end, status: "waiting", tries: 0, highlight: null,
      }));
      const startedAt = Date.now();
      const update = (i: number, patch: Partial<ChunkRun>) => {
        runs = runs.map((r) => (r.index === i ? { ...r, ...patch } : r));
        setState({ kind: "running", stage: "chunks", chunks: runs, startedAt });
      };
      setState({ kind: "running", stage: "chunks", chunks: runs, startedAt });

      const notes: (ChunkNotes | null)[] = Array(texts.length).fill(null);
      let dropped = 0;
      const usage = { input: 0, output: 0 };
      let provider = "mock";
      let cursor = 0;

      const worker = async () => {
        while (cursor < texts.length) {
          const t = texts[cursor++];
          for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
            update(t.index, { status: "running", tries: attempt });
            try {
              const r = await postJson<{ notes: ChunkNotes; dropped: number; usage: typeof usage; provider: string }>(
                "/api/analyze/chunk",
                { index: t.index, total: texts.length, period: `${md(t.start)}~${md(t.end)}`, members: names, text: t.text },
              );
              notes[t.index] = r.notes;
              dropped += r.dropped;
              usage.input += r.usage.input;
              usage.output += r.usage.output;
              provider = r.provider;
              update(t.index, { status: "done", highlight: r.notes.legends[0]?.title ?? null });
              break;
            } catch (e) {
              if (attempt === MAX_TRIES) update(t.index, { status: "failed" });
              else await new Promise((res) => setTimeout(res, 1500 * attempt));
              if (attempt === MAX_TRIES) console.warn(`구간 ${t.index + 1} 실패:`, (e as Error).message);
            }
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, texts.length) }, worker));

      const ok = notes.filter((n): n is ChunkNotes => n !== null);
      if (ok.length === 0) throw new Error("모든 구간 분석이 실패했어요. API 키와 크레딧을 확인해 주세요.");

      setState({ kind: "running", stage: "synth", chunks: runs, startedAt });
      const nameOf = new Map(people.map((p) => [p.id, p.displayName]));
      const synth = await postJson<{ report: Report; usage: typeof usage; provider: string }>("/api/analyze/synthesize", {
        period: periodLabel(stats),
        members: names,
        statsDigest: statsDigest(stats, (id) => nameOf.get(id) ?? id),
        notes: ok,
      });
      usage.input += synth.usage.input;
      usage.output += synth.usage.output;

      const id = newReportId();
      saveReport({
        id,
        createdAt: Date.now(),
        provider: synth.provider ?? provider,
        members: people.map((p, i) => ({ id: p.id, name: p.displayName, color: memberColor(i) })),
        stats,
        report: synth.report,
        usage,
        droppedQuotes: dropped,
      });
      setState({ kind: "done", reportId: id });
      return id;
    },
    onError: (e) => {
      const cur = store.get(analysisAtom);
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
        chunks: cur.kind === "running" ? cur.chunks : [],
      });
    },
  });
}
