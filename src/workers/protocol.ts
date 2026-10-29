import type { MemberGroup } from "@/lib/kakao/members";
import type { RoomStats } from "@/lib/kakao/stats";
import type { ExportFormat } from "@/lib/kakao/types";
import type { Quote } from "@/lib/llm/schema";
import type { ContextMap, PhraseSample } from "@/lib/report/context";

/** 분석할 기간. 대화에 찍힌 벽시계 기준 ms (from 이상, to 이하) */
export interface DateRange {
  from: number;
  to: number;
}

export type WorkerRequest =
  | { type: "parse"; files: File[]; aliases?: Record<string, string[]> }
  | {
      type: "recompute";
      groups: MemberGroup[];
      aliases: Record<string, string[]>;
      range: DateRange | null;
    }
  | { type: "chunkTexts"; groups: MemberGroup[]; range: DateRange | null }
  | {
      /** 분석이 끝난 뒤: 결과에 쓰인 인용의 앞뒤 대화, 말버릇을 쓴 장면 */
      type: "contexts";
      groups: MemberGroup[];
      range: DateRange | null;
      quotes: Quote[];
      phraseMembers: { id: string; name: string; phrases: { text: string; count: number }[] }[];
    };

/** AI 분석을 시작할 때만 메인 스레드로 꺼내는 구간 원문 */
export interface ChunkText {
  index: number;
  start: number;
  end: number;
  text: string;
}

export interface ChunkMeta {
  index: number;
  start: number;
  end: number;
  lines: number;
  bytes: number;
}

export interface ParseMeta {
  files: string[];
  format: ExportFormat;
  title: string | null;
  messageCount: number;
  systemCount: number;
  /** 대화 전체의 첫·마지막 메시지 시각 */
  firstTs: number;
  lastTs: number;
  unparsedLines: number;
  /** 해석 못 한 줄 앞 3개. 이름과 내용을 가린 형태 */
  unparsedSamples: string[];
}

export type WorkerResponse =
  | { type: "progress"; step: "reading" | "parsing" | "stats" }
  | { type: "parsed"; meta: ParseMeta; groups: MemberGroup[]; stats: RoomStats; chunks: ChunkMeta[] }
  | { type: "recomputed"; stats: RoomStats; chunks: ChunkMeta[]; rangeCount: number }
  | { type: "chunkTexts"; chunks: ChunkText[] }
  | { type: "contexts"; contexts: ContextMap; phrases: Record<string, PhraseSample[]> }
  | { type: "error"; message: string };
