import type { ChatMessage } from "./types";
import { maskSensitive } from "./privacy";
import { isSensitive } from "../quiz/sensitive";

/**
 * "아 맞네 ㅋㅋ" 하게 되는 숫자들. 전부 브라우저(워커)에서 코드로 센다 (AI 비용 없음).
 * 원문은 짧은 예시 한두 줄(답 없던 질문, 말버릇)만 남기고, 민감정보는 가리고 민감 주제는 뺀다.
 */
export interface FunStats {
  /** 웃음 유발: 내 말(ㅋㅋ만 있는 말 제외) 뒤 1분 안에 다른 사람이 ㅋㅋ·ㅎㅎ로 받은 횟수와 비율 */
  laughs: { memberId: string; attempts: number; triggers: number; ratio: number }[];
  /** 허공에 외친 말: 내 차례가 끝나고 30분 넘게 아무도 이어 말하지 않은 횟수와 비율 */
  unanswered: { memberId: string; turns: number; count: number; ratio: number }[];
  /** 가장 오래 답이 없던 질문 하나 */
  loneliest: { memberId: string; ts: number; text: string; minutes: number } | null;
  /** 두 사람이 번갈아 주고받은 최장 랠리 (차례 사이 5분 이내) */
  rally: { a: string; b: string; turns: number; ts: number; minutes: number } | null;
  /** 월별 "ㅋ" 길이 평균 (ㅋㅋ가 들어간 말 기준, 가장 긴 ㅋ 줄기) */
  laughLength: { month: string; avg: number }[];
  /** 여러 명이 쓰는 말버릇의 원조와 퍼진 순서 */
  origins: { text: string; spread: { memberId: string; ts: number; count: number }[] }[];
  /** 이 사람이 말한 날과 안 한 날의 방 하루 평균 메시지 */
  mood: { memberId: string; withAvg: number; withoutAvg: number; withDays: number; withoutDays: number }[];
}

const LAUGH_WINDOW = 60_000;
const QUIET = 30 * 60_000;
const RALLY_GAP = 5 * 60_000;
/** 허공 기록은 하루 넘게 비는 경우(방이 잠든 것)를 빼고 본다 */
const QUIET_CAP = 24 * 60 * 60_000;
/** 누구나 쓰는 대답은 원조를 따지는 게 의미가 없어서 뺀다 */
const COMMON = new Set(["네", "넵", "넹", "예", "응", "웅", "ㅇㅇ", "ㅇㅋ", "ㄴㄴ", "ㄱㄱ", "아", "오", "어", "음", "헐", "ok", "ㅇ"]);

const isLaugh = (t: string) => /ㅋㅋ|ㅎㅎ/.test(t);
const laughOnly = (t: string) => /^[ㅋㅎㄱㄲ\s.!~]+$/.test(t);
const dateKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

export function computeFun(
  msgs: ChatMessage[],
  idOf: (m: ChatMessage) => string,
  ids: string[],
  phraseCounts: Map<string, Map<string, number>>,
): FunStats {
  const attempts = new Map(ids.map((id) => [id, 0]));
  const triggers = new Map(ids.map((id) => [id, 0]));
  const turns = new Map(ids.map((id) => [id, 0]));
  const quiet = new Map(ids.map((id) => [id, 0]));
  let loneliest: FunStats["loneliest"] = null;
  let rally: FunStats["rally"] = null;
  let cur: { a: string; b: string; turns: number; start: number } | null = null;
  const months = new Map<string, { sum: number; n: number }>();
  const dayTotal = new Map<string, number>();
  const daySpeakers = new Map<string, Set<string>>();
  let turnStart = 0;

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const id = idOf(m);
    const t = m.kind === "text" ? m.text.trim() : "";
    const day = dateKey(m.ts);
    dayTotal.set(day, (dayTotal.get(day) ?? 0) + 1);
    let sp = daySpeakers.get(day);
    if (!sp) daySpeakers.set(day, (sp = new Set()));
    sp.add(id);

    // 웃음 유발
    if (t && !laughOnly(t)) {
      attempts.set(id, attempts.get(id)! + 1);
      for (let j = i + 1; j < msgs.length && msgs[j].ts - m.ts <= LAUGH_WINDOW; j++) {
        const n = msgs[j];
        if (idOf(n) !== id && n.kind === "text" && isLaugh(n.text)) {
          triggers.set(id, triggers.get(id)! + 1);
          break;
        }
      }
    }

    // ㅋ 길이
    if (t.includes("ㅋㅋ")) {
      let best = 0;
      for (const run of t.match(/ㅋ+/g) ?? []) if (run.length > best) best = run.length;
      const key = day.slice(0, 7);
      const mo = months.get(key) ?? { sum: 0, n: 0 };
      mo.sum += best;
      mo.n++;
      months.set(key, mo);
    }

    // 차례(같은 사람이 이어 보낸 말 묶음) 단위: 허공·랠리
    const prev = msgs[i - 1];
    const prevId = prev ? idOf(prev) : "";
    if (!prev || prevId !== id) {
      // 새 차례 시작
      const gap = prev ? m.ts - prev.ts : Infinity;
      if (gap <= RALLY_GAP && cur && prevId === (id === cur.a ? cur.b : cur.a) && (id === cur.a || id === cur.b)) {
        cur.turns++;
      } else if (gap <= RALLY_GAP && prev) {
        cur = { a: prevId, b: id, turns: 2, start: turnStart };
      } else cur = null;
      if (cur && cur.turns >= 6 && (!rally || cur.turns > rally.turns)) {
        rally = { a: cur.a, b: cur.b, turns: cur.turns, ts: cur.start, minutes: 0 };
      }
      if (rally && cur && rally.ts === cur.start && rally.turns === cur.turns) rally.minutes = Math.round((m.ts - cur.start) / 60_000);
      turnStart = m.ts;
    } else if (cur && m.ts - prev.ts > RALLY_GAP) cur = null;

    const next = msgs[i + 1];
    if (next && idOf(next) !== id) {
      // 내 차례가 끝남
      turns.set(id, turns.get(id)! + 1);
      const gap = next.ts - m.ts;
      if (gap >= QUIET) {
        quiet.set(id, quiet.get(id)! + 1);
        if (gap <= QUIET_CAP && /[?？]\s*$/.test(t) && t.length >= 4 && t.length <= 40 && !isSensitive(t)) {
          const minutes = Math.round(gap / 60_000);
          if (!loneliest || minutes > loneliest.minutes) loneliest = { memberId: id, ts: m.ts, text: maskSensitive(t).text, minutes };
        }
      }
    }
  }

  // 말버릇 원조: 2명 이상이 각자 2번 넘게 쓴 짧은 말
  const candidates: { text: string; users: string[]; total: number }[] = [];
  for (const [text, byMember] of phraseCounts) {
    if (text.length < 2 || COMMON.has(text.toLowerCase()) || laughOnly(text) || !/[\p{L}\p{N}]/u.test(text) || isSensitive(text)) continue;
    const users: string[] = [];
    let total = 0;
    for (const [mid, c] of byMember) {
      total += c;
      if (c >= 2) users.push(mid);
    }
    if (users.length >= 2) candidates.push({ text, users, total });
  }
  candidates.sort((a, b) => b.users.length - a.users.length || b.total - a.total);
  const picked = candidates.slice(0, 3);
  const first = new Map(picked.map((p) => [p.text, new Map<string, number>()]));
  if (picked.length) {
    for (const m of msgs) {
      if (m.kind !== "text") continue;
      const seen = first.get(m.text.trim());
      const id = idOf(m);
      if (seen && !seen.has(id)) seen.set(id, m.ts);
    }
  }
  const origins = picked.map((p) => ({
    text: p.text,
    spread: [...first.get(p.text)!.entries()]
      .filter(([mid]) => p.users.includes(mid))
      .sort((a, b) => a[1] - b[1])
      .map(([memberId, ts]) => ({ memberId, ts, count: phraseCounts.get(p.text)!.get(memberId) ?? 0 })),
  }));

  // 분위기 메이커: 방이 대화한 날만 비교 (아무도 말 안 한 날은 뺀다)
  const mood = ids.map((memberId) => {
    let wSum = 0, wN = 0, oSum = 0, oN = 0;
    for (const [day, total] of dayTotal) {
      if (daySpeakers.get(day)!.has(memberId)) { wSum += total; wN++; } else { oSum += total; oN++; }
    }
    return { memberId, withAvg: wN ? wSum / wN : 0, withoutAvg: oN ? oSum / oN : 0, withDays: wN, withoutDays: oN };
  });

  return {
    laughs: ids.map((memberId) => {
      const a = attempts.get(memberId)!;
      const tr = triggers.get(memberId)!;
      return { memberId, attempts: a, triggers: tr, ratio: a ? tr / a : 0 };
    }),
    unanswered: ids.map((memberId) => {
      const tn = turns.get(memberId)!;
      const q = quiet.get(memberId)!;
      return { memberId, turns: tn, count: q, ratio: tn ? q / tn : 0 };
    }),
    loneliest,
    rally,
    laughLength: [...months.entries()].sort().map(([month, v]) => ({ month, avg: v.sum / v.n })),
    origins,
    mood,
  };
}

/** 이름 뒤 조사: 받침 있으면 "이", 없으면 "가" (한글로 안 끝나면 "이(가)") */
export function iga(name: string): string {
  const c = name.trim().charCodeAt(name.trim().length - 1);
  if (c < 0xac00 || c > 0xd7a3) return `${name}이(가)`;
  return (c - 0xac00) % 28 ? `${name}이` : `${name}가`;
}

/** 표본이 너무 적으면 비율이 튀어서 순위에서 뺀다 */
export const MIN_SAMPLE = 20;

/** 결과·대기 화면·AI 입력에 같이 쓰는 한 줄 요약들 */
export function funLines(fun: FunStats | undefined, nameOf: (id: string) => string): string[] {
  if (!fun) return [];
  const out: string[] = [];
  const pct = (n: number) => Math.round(n * 100);
  const laugh = [...fun.laughs].filter((l) => l.attempts >= MIN_SAMPLE).sort((a, b) => b.ratio - a.ratio)[0];
  if (laugh && laugh.ratio >= 0.1) out.push(`${iga(nameOf(laugh.memberId))} 말하면 ${pct(laugh.ratio)}% 확률로 ㅋㅋ가 터져요`);
  const lonely = [...fun.unanswered].filter((u) => u.turns >= MIN_SAMPLE).sort((a, b) => b.ratio - a.ratio)[0];
  if (lonely && lonely.count > 0) out.push(`${nameOf(lonely.memberId)}의 말 ${pct(lonely.ratio)}%는 30분 넘게 아무도 안 받았어요`);
  if (fun.rally) out.push(`${nameOf(fun.rally.a)} ↔ ${nameOf(fun.rally.b)}, 쉬지 않고 ${fun.rally.turns}번 주고받은 랠리 기록`);
  const o = fun.origins[0];
  if (o && o.spread.length >= 2) out.push(`‘${o.text}’의 원조는 ${nameOf(o.spread[0].memberId)}, 지금은 ${o.spread.length}명이 써요`);
  const mood = bestMood(fun);
  if (mood) out.push(`${iga(nameOf(mood.memberId))} 말한 날엔 방 메시지가 ${mood.times.toFixed(1)}배예요`);
  const ll = fun.laughLength;
  if (ll.length >= 2 && ll[ll.length - 1].avg - ll[0].avg >= 0.5) {
    out.push(`ㅋ 길이가 ${ll[0].avg.toFixed(1)}개에서 ${ll[ll.length - 1].avg.toFixed(1)}개로 늘었어요`);
  }
  return out;
}

/** 말한 날/안 한 날 차이가 가장 큰 사람 (양쪽 다 3일 이상일 때만) */
export function bestMood(fun: FunStats) {
  let best: { memberId: string; times: number; withAvg: number; withoutAvg: number } | null = null;
  for (const m of fun.mood) {
    if (m.withDays < 3 || m.withoutDays < 3 || m.withoutAvg <= 0) continue;
    const times = m.withAvg / m.withoutAvg;
    if (times >= 1.2 && (!best || times > best.times)) best = { memberId: m.memberId, times, withAvg: m.withAvg, withoutAvg: m.withoutAvg };
  }
  return best;
}
