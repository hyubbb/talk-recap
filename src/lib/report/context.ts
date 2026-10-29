import type { ChatMessage } from "../kakao/types";
import type { Quote, Report } from "../llm/schema";
import { maskSensitive } from "../kakao/privacy";
import { isSensitive } from "../quiz/sensitive";

/**
 * 근거 인용의 앞뒤 대화(문맥). 분석이 끝나는 순간 브라우저 워커에서만 만든다.
 * 원문 전체가 아니라 결과에 쓰인 인용 주변 몇 줄만 남긴다. 민감정보는 가리고, 민감 주제 줄은 숨긴다.
 */
export interface ContextLine {
  date: string; // "M/D"
  time: string; // "HH:MM"
  who: string;
  text: string;
}
export interface ContextBlock {
  lines: ContextLine[];
  /** lines 중 인용 자신의 위치 */
  focus: number;
}
/** quoteKey(q) → 문맥 */
export type ContextMap = Record<string, ContextBlock>;

/** 말버릇 한 개와 실제로 쓴 장면 하나 */
export interface PhraseSample {
  text: string;
  count: number;
  context: ContextBlock | null;
}

export const RADIUS = 2;
const MAX_TEXT = 200;
const HIDDEN = "(민감한 내용이라 가렸어요)";
const KIND_LABEL: Record<string, string> = {
  photo: "(사진)",
  video: "(동영상)",
  emoticon: "(이모티콘)",
  file: "(파일)",
  deleted: "(삭제된 메시지)",
};

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const pad = (n: number) => String(n).padStart(2, "0");

export function quoteKey(q: Pick<Quote, "who" | "date" | "text">): string {
  return `${q.who}|${q.date}|${norm(q.text)}`;
}

interface Row {
  m: ChatMessage;
  who: string;
  date: string;
  /** 가린 뒤 정규화한 본문 (찾기용) */
  hay: string;
}

function rows(messages: ChatMessage[], nameOf: (author: string) => string | null): Row[] {
  const out: Row[] = [];
  for (const m of messages) {
    const who = nameOf(m.author);
    if (!who) continue;
    const d = new Date(m.ts);
    const text = m.kind === "text" || m.kind === "link" ? maskSensitive(m.text).text : "";
    out.push({ m, who, date: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, hay: norm(text) });
  }
  return out;
}

function lineOf(r: Row): ContextLine {
  const d = new Date(r.m.ts);
  let text = KIND_LABEL[r.m.kind] ?? maskSensitive(r.m.text).text.trim();
  if (isSensitive(text)) text = HIDDEN;
  if (text.length > MAX_TEXT) text = `${text.slice(0, MAX_TEXT)}…`;
  return { date: r.date, time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`, who: r.who, text };
}

function block(list: Row[], i: number, radius = RADIUS): ContextBlock {
  const from = Math.max(0, i - radius);
  const to = Math.min(list.length - 1, i + radius);
  const lines: ContextLine[] = [];
  for (let k = from; k <= to; k++) lines.push(lineOf(list[k]));
  return { lines, focus: i - from };
}

/** 리포트에 쓰인 모든 인용 (멤버·명장면·꼭지·어워드) */
export function reportQuotes(report: Report): Quote[] {
  const out: Quote[] = [];
  for (const m of report.members) {
    for (const q of m.quotes) out.push(q);
    for (const b of [...(m.scenes ?? []), ...(m.sections ?? [])]) for (const q of b.quotes) out.push(q);
  }
  for (const a of report.awards) for (const q of a.quotes ?? []) out.push(q);
  return out;
}

/** 인용마다 원문에서 위치를 찾아 앞뒤 radius줄을 붙인다. 못 찾은 인용은 빠진다. */
export function extractContexts(
  messages: ChatMessage[],
  nameOf: (author: string) => string | null,
  quotes: Quote[],
  radius = RADIUS,
): ContextMap {
  const list = rows(messages, nameOf);
  const byDate = new Map<string, number[]>();
  for (let i = 0; i < list.length; i++) {
    const arr = byDate.get(list[i].date);
    if (arr) arr.push(i);
    else byDate.set(list[i].date, [i]);
  }
  const out: ContextMap = {};
  for (const q of quotes) {
    const key = quoteKey(q);
    if (out[key]) continue;
    const target = norm(q.text);
    if (target.length < 2) continue;
    const idx = byDate.get(q.date) ?? [];
    let hit = idx.find((i) => list[i].who === q.who && list[i].hay.includes(target));
    hit ??= idx.find((i) => list[i].hay.includes(target));
    if (hit !== undefined) out[key] = block(list, hit, radius);
  }
  return out;
}

/**
 * 멤버별 말버릇(통계의 catchphrases 상위)마다 실제로 쓴 장면 하나를 고른다.
 * 앞뒤가 사진·이모티콘이 아닌 장면을 우선하고, 그중 가운데쯤을 고른다 (매번 같은 결과).
 */
export function phraseSamples(
  messages: ChatMessage[],
  nameOf: (author: string) => string | null,
  members: { id: string; name: string; phrases: { text: string; count: number }[] }[],
  perMember = 4,
): Record<string, PhraseSample[]> {
  const list = rows(messages, nameOf);
  const out: Record<string, PhraseSample[]> = {};
  for (const mem of members) {
    const wanted = mem.phrases.filter((p) => !isSensitive(p.text)).slice(0, perMember);
    const hits = new Map<string, number[]>(wanted.map((p) => [p.text, []]));
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.who !== mem.name || r.m.kind !== "text") continue;
      hits.get(r.m.text.trim())?.push(i);
    }
    out[mem.id] = wanted.map((p) => {
      const at = hits.get(p.text) ?? [];
      const textual = (i: number) => (list[i - 1]?.m.kind ?? "text") === "text" && (list[i + 1]?.m.kind ?? "text") === "text";
      const good = at.filter(textual);
      const pool = good.length ? good : at;
      const pick = pool[Math.floor(pool.length / 2)];
      return { text: p.text, count: p.count, context: pick === undefined ? null : block(list, pick) };
    });
  }
  return out;
}
