import type { MemberGroup } from "@/lib/kakao/members";
import type { RoomStats } from "@/lib/kakao/stats";
import type { ExportFormat } from "@/lib/kakao/types";

export type WorkerRequest =
  | { type: "parse"; files: File[]; aliases?: Record<string, string[]> }
  | { type: "recompute"; groups: MemberGroup[]; aliases: Record<string, string[]> };

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
  unparsedLines: number;
}

export type WorkerResponse =
  | { type: "progress"; step: "reading" | "parsing" | "stats" }
  | { type: "parsed"; meta: ParseMeta; groups: MemberGroup[]; stats: RoomStats; chunks: ChunkMeta[] }
  | { type: "recomputed"; stats: RoomStats; chunks: ChunkMeta[] }
  | { type: "error"; message: string };
