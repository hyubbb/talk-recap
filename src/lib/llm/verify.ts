import type { ChunkNotes, Quote, Report, StoryBlock } from "./schema";
import { isSensitive } from "../quiz/sensitive";

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

const MEMBER_QUOTES = 5;
const AWARD_QUOTES = 2;
const DICTIONARY = 5;

/**
 * 종합 리포트 전체의 인용을 구간 노트 인용과 대조한다.
 * - 멤버 quotes: 본인 말만, 최대 5개, 중복 제거
 * - 명장면·꼭지: 노트에 없는 인용은 버리고, 근거가 하나도 안 남은 꼭지는 통째로 버린다
 * - 어워드: 수상자 본인 말만 최대 2개
 * - 사전: 코드가 뽑은 후보 말만, 민감 주제는 빼고, 인용은 그 말이 들어간 것만 최대 2개 (단어 자체는 코드로 센 말이라 인용이 없어도 남긴다)
 */
export function verifyReport(report: Report, known: Quote[], words: string[] = []): Report {
  const set = new Set(known.map((q) => norm(q.text)));
  const real = (q: Quote) => norm(q.text).length >= 2 && set.has(norm(q.text));
  const uniq = (qs: Quote[], limit: number) => {
    const seen = new Set<string>();
    const out: Quote[] = [];
    for (const q of qs) {
      const k = norm(q.text);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(q);
      if (out.length >= limit) break;
    }
    return out;
  };
  const blocks = (bs: StoryBlock[]) =>
    bs.map((b) => ({ ...b, quotes: uniq(b.quotes.filter(real), 3) })).filter((b) => b.quotes.length > 0);

  return {
    ...report,
    members: report.members.map((m) => ({
      ...m,
      quotes: uniq(m.quotes.filter((q) => real(q) && q.who === m.name), MEMBER_QUOTES),
      scenes: blocks(m.scenes).slice(0, 2),
      sections: blocks(m.sections).slice(0, 3),
    })),
    awards: report.awards.map((a) => ({
      ...a,
      quotes: uniq(a.quotes.filter((q) => real(q) && a.winner.includes(q.who)), AWARD_QUOTES),
    })),
    dictionary: dictionary(report.dictionary ?? [], words, real),
  };
}

function dictionary(entries: Report["dictionary"], words: string[], real: (q: Quote) => boolean): Report["dictionary"] {
  const allowed = new Map(words.map((w) => [norm(w), w]));
  const seen = new Set<string>();
  const out: Report["dictionary"] = [];
  for (const e of entries) {
    const word = allowed.get(norm(e.word));
    if (!word || seen.has(word) || !e.meaning.trim() || isSensitive(`${word} ${e.meaning}`)) continue;
    seen.add(word);
    const quotes: Quote[] = [];
    for (const q of e.quotes) {
      if (real(q) && norm(q.text).includes(norm(word)) && !quotes.some((x) => norm(x.text) === norm(q.text))) quotes.push(q);
      if (quotes.length >= 2) break;
    }
    out.push({ word, meaning: e.meaning.trim(), quotes });
    if (out.length >= DICTIONARY) break;
  }
  return out;
}
