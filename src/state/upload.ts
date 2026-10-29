import { atom } from "jotai";
import type { MemberGroup } from "@/lib/kakao/members";
import type { RoomStats } from "@/lib/kakao/stats";
import type { ChunkMeta, ParseMeta } from "@/workers/protocol";

export type UploadPhase =
  | { kind: "idle" }
  | { kind: "working"; step: "reading" | "parsing" | "stats" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export const phaseAtom = atom<UploadPhase>({ kind: "idle" });
export const metaAtom = atom<ParseMeta | null>(null);
export const groupsAtom = atom<MemberGroup[]>([]);
/** 멤버 id → 다른 사람들이 부르는 별명 */
export const aliasesAtom = atom<Record<string, string[]>>({});
export const statsAtom = atom<RoomStats | null>(null);
export const chunksAtom = atom<ChunkMeta[]>([]);
export const consentAtom = atom(false);

/** 사람(봇 제외) 멤버만 */
export const peopleAtom = atom((get) => get(groupsAtom).filter((g) => !g.isBot));
