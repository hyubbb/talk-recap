"use client";

import { useSetAtom, useStore } from "jotai";
import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { analysisAtom, type ChunkRun } from "@/state/analysis";
import { groupsAtom, rangeAtom, statsAtom } from "@/state/upload";
import { periodLabel, statsDigest } from "@/lib/report/digest";
import { newReportId, saveReport } from "@/lib/report/storage";
import { memberColor } from "@/lib/ui/colors";
import type { ChunkNotes, Report } from "@/lib/llm/schema";
import type { ChunkText, DateRange } from "@/workers/protocol";
import type { MemberGroup } from "@/lib/kakao/members";
import { reportQuotes } from "@/lib/report/context";
import type { ContextRequest, ContextResult } from "@/hooks/useAnalyzeWorker";
import {
  finishPending,
  loadProgress,
  orderHeaders,
  saveChunkProgress,
  saveSynthProgress,
  type ChunkCheckpoint,
  type SynthCheckpoint,
} from "@/lib/pay/pending";

/** 분석 시작 결제 증빙 (결제 없이 무료로 돌릴 때는 null) */
export type PaidOrder = { orderNo: string; secret: string } | null;

const CONCURRENCY = 3;
const MAX_TRIES = 3;

async function postJson<T>(url: string, body: unknown, extra: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...extra }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `요청 실패 (${res.status})`);
  return json as T;
}

const md = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

/** 같은 구간인지 가리는 키 (다시 시도할 때 끝난 구간을 건너뛴다) */
const runKey = (t: ChunkText, total: number) => `${total}:${t.index}:${t.start}:${t.end}:${t.text.length}`;

/**
 * 구간 분석을 병렬로 돌리고(동시 3개, 실패 시 최대 3번), 끝나면 종합해서 저장한다.
 * 끝난 구간·종합은 기억해 두고 다시 시도하면 건너뛴다.
 * 결제한 분석은 이 브라우저 IndexedDB에도 남겨서, 새로고침해도 같은 결제로 이어서 한다.
 */
export function useRunAnalysis(
  chunkTexts: (groups: MemberGroup[], range: DateRange | null) => Promise<ChunkText[]>,
  contexts?: (req: ContextRequest) => Promise<ContextResult>,
) {
  const store = useStore();
  const setState = useSetAtom(analysisAtom);
  // 결제 없이 돌릴 때도 "다시 시도"는 끝난 구간을 건너뛰게 메모리에 둔다 (새로고침하면 사라짐)
  const memo = useRef(new Map<string, ChunkCheckpoint>());
  const memoSynth = useRef<{ key: string; value: SynthCheckpoint } | null>(null);

  return useMutation({
    mutationFn: async (order: PaidOrder = null) => {
      const auth = orderHeaders(order);
      // 멤버 확인에서 바꾼 이름(displayName)이 구간 원문·결과·스토리·퀴즈 전체에 쓰인다. 빈 이름은 원래 이름으로
      const groups = store.get(groupsAtom).map((g) => ({ ...g, displayName: g.displayName.trim() || g.names[0] }));
      const stats = store.get(statsAtom)!;
      const people = groups.filter((g) => !g.isBot);
      const names = people.map((g) => g.displayName);
      const texts = await chunkTexts(groups, store.get(rangeAtom));
      const total = texts.length;
      const allKey = texts.map((t) => runKey(t, total)).join("|");

      // 끝내 둔 단계: 결제한 분석은 IndexedDB(새로고침 대비), 아니면 메모리(다시 시도 대비)
      const saved = new Map<number, ChunkCheckpoint>();
      let savedSynth: SynthCheckpoint | null = null;
      for (const t of texts) {
        const m = memo.current.get(runKey(t, total));
        if (m) saved.set(t.index, m);
      }
      if (memoSynth.current?.key === allKey) savedSynth = memoSynth.current.value;
      if (order) {
        const p = await loadProgress(order.orderNo, total).catch(() => null);
        for (const c of p?.chunks ?? []) saved.set(c.index, c);
        savedSynth ??= p?.synth ?? null;
      }
      const remember = (t: ChunkText, c: ChunkCheckpoint) => {
        memo.current.set(runKey(t, total), c);
        if (order) saveChunkProgress(order.orderNo, c).catch(() => {});
      };

      let runs: ChunkRun[] = texts.map((t) => {
        const c = saved.get(t.index);
        return c
          ? { index: t.index, start: t.start, end: t.end, status: "done", tries: 1, highlight: c.notes.legends[0]?.title ?? null }
          : { index: t.index, start: t.start, end: t.end, status: "waiting", tries: 0, highlight: null };
      });
      const startedAt = Date.now();
      const update = (i: number, patch: Partial<ChunkRun>) => {
        runs = runs.map((r) => (r.index === i ? { ...r, ...patch } : r));
        setState({ kind: "running", stage: "chunks", chunks: runs, startedAt });
      };
      setState({ kind: "running", stage: "chunks", chunks: runs, startedAt });

      const notes: (ChunkNotes | null)[] = Array(total).fill(null);
      let dropped = 0;
      const usage = { input: 0, output: 0 };
      let provider = "mock";
      for (const c of saved.values()) {
        notes[c.index] = c.notes;
        dropped += c.dropped;
        usage.input += c.usage.input;
        usage.output += c.usage.output;
        provider = c.provider;
      }
      const todo = savedSynth ? [] : texts.filter((t) => !saved.has(t.index));
      let cursor = 0;

      const worker = async () => {
        while (cursor < todo.length) {
          const t = todo[cursor++];
          for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
            update(t.index, { status: "running", tries: attempt });
            try {
              const r = await postJson<{ notes: ChunkNotes; dropped: number; usage: typeof usage; provider: string }>(
                "/api/analyze/chunk",
                { index: t.index, total, period: `${md(t.start)}~${md(t.end)}`, members: names, text: t.text, start: t.start, end: t.end },
                auth,
              );
              notes[t.index] = r.notes;
              remember(t, { index: t.index, total, notes: r.notes, dropped: r.dropped, usage: r.usage, provider: r.provider });
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
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));

      let synth: { report: Report; provider: string };
      if (savedSynth) {
        synth = savedSynth;
        dropped = savedSynth.dropped;
        usage.input = savedSynth.usage.input;
        usage.output = savedSynth.usage.output;
      } else {
        const ok = notes.filter((n): n is ChunkNotes => n !== null);
        if (ok.length === 0) throw new Error("모든 구간 분석이 실패했어요. API 키와 크레딧을 확인해 주세요.");

        setState({ kind: "running", stage: "synth", chunks: runs, startedAt });
        const nameOf = new Map(people.map((p) => [p.id, p.displayName]));
        const r = await postJson<{ report: Report; usage: typeof usage; provider: string }>("/api/analyze/synthesize", {
          period: periodLabel(stats),
          members: names,
          statsDigest: statsDigest(stats, (id) => nameOf.get(id) ?? id),
          notes: ok,
        }, auth);
        usage.input += r.usage.input;
        usage.output += r.usage.output;
        synth = r;
        const cp: SynthCheckpoint = { total, dropped, report: r.report, usage: { ...usage }, provider: r.provider };
        memoSynth.current = { key: allKey, value: cp };
        if (order) saveSynthProgress(order.orderNo, cp).catch(() => {});
      }

      // 결과에 쓰인 인용의 앞뒤 대화와 말버릇 장면을 브라우저 워커에서 뽑는다 (실패해도 결과는 저장)
      let extra: ContextResult | null = null;
      if (contexts) {
        const phraseMembers = people.map((p) => ({
          id: p.id,
          name: p.displayName,
          phrases: stats.members.find((m) => m.id === p.id)?.catchphrases ?? [],
        }));
        extra = await Promise.race([
          contexts({ groups, range: store.get(rangeAtom), quotes: reportQuotes(synth.report), phraseMembers }),
          new Promise<null>((res) => setTimeout(() => res(null), 15_000)),
        ]).catch(() => null);
      }

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
        ...(extra ? { contexts: extra.contexts, phrases: extra.phrases } : {}),
      });
      memo.current.clear();
      memoSynth.current = null;
      if (order) await finishPending(order.orderNo, id).catch(() => {});
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
