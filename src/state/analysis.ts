import { atom } from "jotai";

export type ChunkStatus = "waiting" | "running" | "done" | "failed";

export interface ChunkRun {
  index: number;
  start: number;
  end: number;
  status: ChunkStatus;
  tries: number;
  /** 끝난 구간에서 건진 레전드 장면 (진행 화면 티커용) */
  highlight: string | null;
}

export type AnalysisState =
  | { kind: "idle" }
  | { kind: "running"; stage: "chunks" | "synth"; chunks: ChunkRun[]; startedAt: number }
  | { kind: "done"; reportId: string }
  | { kind: "error"; message: string; chunks: ChunkRun[] };

export const analysisAtom = atom<AnalysisState>({ kind: "idle" });
