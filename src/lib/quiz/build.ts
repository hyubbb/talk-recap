import type { SavedReport } from "../report/storage";
import { isSensitive } from "./sensitive";

export interface QuizQuestion {
  kind: "quote" | "stat";
  /** 문제 문장. quote 문제면 인용 원문 */
  prompt: string;
  /** 정답 공개 때 보여줄 원문 날짜 (quote 문제) 또는 설명 (stat 문제) */
  reveal: string;
  answer: string;
  options: string[];
}

export const QUIZ_SIZE = 10;
const MAX_PER_PERSON = 3;
const MIN_QUOTE_CHARS = 4;

/** 시드가 있는 난수 (같은 리포트면 같은 문제) */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 보기: 정답 + 다른 멤버, 최대 4개 (멤버가 4명 미만이면 전원) */
function optionsFor(answer: string, names: string[], rnd: () => number): string[] {
  const others = shuffle(names.filter((n) => n !== answer), rnd).slice(0, 3);
  return shuffle([answer, ...others], rnd);
}

const usable = (text: string) => text.replace(/\s/g, "").length >= MIN_QUOTE_CHARS && !isSensitive(text);

function statQuestions(saved: SavedReport): Omit<QuizQuestion, "options">[] {
  const nameOf = new Map(saved.members.map((m) => [m.id, m.name]));
  const members = saved.stats.members.filter((m) => nameOf.has(m.id));
  const out: Omit<QuizQuestion, "options">[] = [];

  // 말버릇: 사람마다 가장 많이 친 말 중 가장 큰 것
  const phrases = members
    .flatMap((m) => m.catchphrases.slice(0, 1).map((c) => ({ m, c })))
    .filter(({ c }) => c.text.trim().length > 0 && !isSensitive(c.text))
    .sort((a, b) => b.c.count - a.c.count);
  if (phrases[0]) {
    const { m, c } = phrases[0];
    out.push({
      kind: "stat",
      prompt: `'${c.text.trim()}'을(를) ${c.count.toLocaleString("ko-KR")}번 친 사람은?`,
      reveal: `${nameOf.get(m.id)}의 말버릇 1위`,
      answer: nameOf.get(m.id)!,
    });
  }
  const top = <K extends "messages" | "lastWord" | "nightRatio" | "photos">(k: K) =>
    [...members].sort((a, b) => b[k] - a[k])[0];
  const chatty = top("messages");
  if (chatty && chatty.messages > 0) {
    out.push({
      kind: "stat",
      prompt: `메시지를 가장 많이 보낸 사람은? (${chatty.messages.toLocaleString("ko-KR")}개)`,
      reveal: `전체의 ${Math.round(chatty.share * 100)}%`,
      answer: nameOf.get(chatty.id)!,
    });
  }
  const closer = top("lastWord");
  if (closer && closer.lastWord > 0) {
    out.push({
      kind: "stat",
      prompt: `대화를 끝낸 횟수 ${closer.lastWord.toLocaleString("ko-KR")}번, 마지막 한마디 장인은?`,
      reveal: "말하고 나면 한동안 조용해진 횟수",
      answer: nameOf.get(closer.id)!,
    });
  }
  const owl = top("nightRatio");
  if (owl && owl.nightRatio > 0) {
    out.push({
      kind: "stat",
      prompt: `밤 10시~새벽 2시에 가장 살아나는 사람은? (${Math.round(owl.nightRatio * 100)}%)`,
      reveal: "자기 메시지 중 밤 시간 비율",
      answer: nameOf.get(owl.id)!,
    });
  }
  return out;
}

/**
 * "이 말 누가 했게?" 10문제. LLM 없이 리포트의 검증된 인용과 통계로만 만든다.
 * - 같은 사람이 정답인 문제는 최대 3개
 * - 통계 문제 2~3개
 * - 민감 단어가 있거나 4자 미만인 인용은 쓰지 않는다
 */
export function buildQuiz(saved: SavedReport, seed = saved.id): QuizQuestion[] {
  const rnd = seededRandom(seed);
  const names = saved.members.map((m) => m.name);
  if (names.length < 2) return [];

  const perPerson = new Map<string, number>();
  const take = (who: string) => {
    const n = perPerson.get(who) ?? 0;
    if (n >= MAX_PER_PERSON) return false;
    perPerson.set(who, n + 1);
    return true;
  };

  const stats = shuffle(statQuestions(saved), rnd);
  const seen = new Set<string>();
  const quotes = shuffle(
    saved.report.members.flatMap((m) =>
      m.quotes
        .filter((q) => names.includes(m.name) && usable(q.text))
        .map((q) => ({ who: m.name, text: q.text.trim(), date: q.date })),
    ),
    rnd,
  ).filter((q) => (seen.has(q.text) ? false : (seen.add(q.text), true)));

  const statTarget = Math.min(stats.length, quotes.length >= QUIZ_SIZE - 2 ? 2 : 3);
  const picked: Omit<QuizQuestion, "options">[] = [];
  for (const s of stats) {
    if (picked.length >= statTarget) break;
    if (take(s.answer)) picked.push(s);
  }
  for (const q of quotes) {
    if (picked.length >= QUIZ_SIZE) break;
    if (take(q.who)) picked.push({ kind: "quote", prompt: q.text, reveal: q.date, answer: q.who });
  }
  // 인용이 모자라면 남은 통계 문제로 채운다
  for (const s of stats) {
    if (picked.length >= QUIZ_SIZE) break;
    if (!picked.includes(s) && take(s.answer)) picked.push(s);
  }

  return shuffle(picked, rnd).map((q) => ({ ...q, options: optionsFor(q.answer, names, rnd) }));
}

export function scoreOf(correct: number, total: number): number {
  return total ? Math.round((correct / total) * 100) : 0;
}
