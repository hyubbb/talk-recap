import type { MemberGroup } from "@/lib/kakao/members";
import type { RoomStats } from "@/lib/kakao/stats";
import type { ExportFormat } from "@/lib/kakao/types";

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
    };

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
}

export type WorkerResponse =
  | { type: "progress"; step: "reading" | "parsing" | "stats" }
  | { type: "parsed"; meta: ParseMeta; groups: MemberGroup[]; stats: RoomStats; chunks: ChunkMeta[] }
  | { type: "recomputed"; stats: RoomStats; chunks: ChunkMeta[]; rangeCount: number }
  | { type: "error"; message: string };
