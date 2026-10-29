/// <reference lib="webworker" />
import JSZip from "jszip";
import { mergeParsed, parseKakaoText, sortSplitFiles } from "@/lib/kakao/parse";
import { suggestMembers, type MemberGroup } from "@/lib/kakao/members";
import { computeStats } from "@/lib/kakao/stats";
import { chunkMessages } from "@/lib/kakao/chunk";
import type { ChatMessage, ExportFormat } from "@/lib/kakao/types";
import type { DateRange, WorkerRequest, WorkerResponse } from "./protocol";

// 원문 메시지는 이 워커 메모리 안에만 둔다. 메인 스레드와 서버로는 통계만 나간다.
let messages: ChatMessage[] = [];

const post = (msg: WorkerResponse) => (self as unknown as Worker).postMessage(msg);

async function readFiles(files: File[]): Promise<{ name: string; text: string }[]> {
  const out: { name: string; text: string }[] = [];
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      const zip = await JSZip.loadAsync(f);
      for (const entry of Object.values(zip.files)) {
        if (entry.dir || !/\.(txt|csv)$/i.test(entry.name) || entry.name.startsWith("__MACOSX")) continue;
        out.push({ name: entry.name, text: await entry.async("string") });
      }
    } else {
      out.push({ name: f.name, text: await f.text() });
    }
  }
  return out;
}

function inRange(range: DateRange | null): ChatMessage[] {
  if (!range) return messages;
  return messages.filter((m) => m.ts >= range.from && m.ts <= range.to);
}

function summarize(groups: MemberGroup[], aliases: Record<string, string[]>, range: DateRange | null = null) {
  const picked = inRange(range);
  const stats = computeStats(picked, groups, aliases);
  const include = new Set(groups.filter((g) => !g.isBot).flatMap((g) => g.names));
  const nameOf = new Map(groups.flatMap((g) => g.names.map((n) => [n, g.displayName] as const)));
  const chunks = chunkMessages(picked, (a) => (include.has(a) ? nameOf.get(a) ?? a : null));
  // 구간 원문은 분석 요청 단계에서만 꺼낸다. 지금은 크기 정보만 넘긴다.
  return {
    stats,
    rangeCount: picked.length,
    chunks: chunks.map((c) => ({ index: c.index, start: c.start, end: c.end, lines: c.lines, bytes: c.bytes })),
  };
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === "parse") {
      post({ type: "progress", step: "reading" });
      const files = sortSplitFiles(await readFiles(req.files));
      if (!files.length) throw new Error("대화 파일(.txt, .csv)을 찾지 못했어요.");
      post({ type: "progress", step: "parsing" });
      const merged = mergeParsed(files.map((f) => parseKakaoText(f.text)));
      if (!merged.messages.length) throw new Error("메시지를 하나도 읽지 못했어요. 카카오톡에서 내보낸 파일인지 확인해 주세요.");
      messages = merged.messages;
      const groups = suggestMembers(messages);
      post({ type: "progress", step: "stats" });
      const first = summarize(groups, req.aliases ?? {});
      post({
        type: "parsed",
        meta: {
          files: files.map((f) => f.name),
          format: merged.format as ExportFormat,
          title: merged.title,
          messageCount: merged.messages.length,
          systemCount: merged.system.length,
          unparsedLines: merged.unparsedLines,
          firstTs: merged.messages[0].ts,
          lastTs: merged.messages[merged.messages.length - 1].ts,
        },
        groups,
        stats: first.stats,
        chunks: first.chunks,
      });
    } else if (req.type === "recompute") {
      post({ type: "recomputed", ...summarize(req.groups, req.aliases, req.range) });
    }
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
