import type { ChunkNotes, Quote } from "./schema";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * 인용이 실제 구간 원문에 있는지 확인한다. 없는 인용(환각)은 버린다.
 * 원문 줄 형식: "M/D HH:MM 이름: 내용"
 */
export function verifyQuotes(notes: ChunkNotes, chunkText: string): { notes: ChunkNotes; dropped: number } {
  const hay = norm(chunkText);
  let dropped = 0;
  const ok = (q: Quote) => {
    const t = norm(q.text);
    const pass = t.length >= 2 && hay.includes(t);
    if (!pass) dropped++;
    return pass;
  };
  return {
    notes: { ...notes, members: notes.members.map((m) => ({ ...m, quotes: m.quotes.filter(ok) })) },
    dropped,
  };
}

/** 종합 리포트의 인용은 구간 노트에 있던 인용만 남긴다. */
export function keepKnownQuotes<T extends { quotes: Quote[] }>(members: T[], known: Quote[]): T[] {
  const set = new Set(known.map((q) => norm(q.text)));
  return members.map((m) => ({ ...m, quotes: m.quotes.filter((q) => set.has(norm(q.text))) }));
}
