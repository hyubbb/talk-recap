import type { ChatMessage } from "./types";
import { maskSensitive } from "./privacy";
import { isSensitive } from "../quiz/sensitive";
import { COMMON, MIN_SAMPLE, laughOnly } from "./fun";

const DAY = 86_400_000;
/** 이름이 불린 뒤 이 시간 안에 말해야 "답한" 걸로 본다 (넘으면 그냥 다음에 들른 것) */
const SUMMON_CAP = 6 * 3_600_000;
/** 텔레파시: 두 사람이 이 시간 안에 이어서 똑같은 말 (카톡 내보내기는 분 단위라 1분) */
const JINX_WINDOW = 60_000;
/** 잠수로 치려면 그동안 다른 사람들이 이만큼은 떠들어야 한다 (방 전체가 잠든 건 잠수가 아니다) */
const GHOST_MIN_MISSED = 20;
/** 잔디 달력에 남기는 기간 (53주) */
export const CALENDAR_DAYS = 53 * 7 - 1;

/**
 * 잠수·부르면 출동·텔레파시·근무 중 딴짓·메시지 지우개·잔디 달력. 워커에서 코드로 센다 (AI 비용 없음).
 * 원문은 잠수 후 첫마디·텔레파시 말 한 줄씩만 남기고, 민감정보는 가리고 민감 주제는 뺀다.
 */
export interface RecordStats {
  /** 멤버마다 가장 오래 말이 없던 기간과 돌아와서 친 첫마디 (text는 못 보여주면 "") */
  ghosts: { memberId: string; days: number; from: number; to: number; missed: number; text: string }[];
  /** 이름이 불린 뒤 그 사람이 말하기까지 걸린 시간의 중간값(분). 6시간 안에 말한 것만 */
  summons: { memberId: string; calls: number; median: number }[];
  /** 두 사람이 1분 안에 이어서 똑같은 말을 친 횟수가 가장 많은 쌍 */
  jinx: { a: string; b: string; count: number; text: string } | null;
  /** 평일 9~18시에 보낸 메시지 */
  workHours: { memberId: string; messages: number; work: number }[];
  /** 보냈다가 지운 메시지 */
  deleted: { memberId: string; count: number }[];
  /** 날짜별 메시지 수 (말이 있던 날만, 날짜순). 잔디 달력용이라 마지막 날 기준 최근 53주만 */
  daily: { date: string; count: number }[];
  /** 전체 기간에서 하루도 안 빼고 대화한 최장 연속 일수 */
  streak: { days: number; from: string; to: string } | null;
}

const dateKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);
const norm = (t: string) => t.replace(/\s+/g, " ").trim();

/** 짧게 보여줘도 되는 한 줄 (민감 주제·빈 글자·너무 긴 말 제외, 민감정보는 가림) */
function example(t: string): string {
  const s = norm(t);
  if (s.length < 2 || s.length > 40 || !/[\p{L}\p{N}]/u.test(s) || isSensitive(s)) return "";
  return maskSensitive(s).text;
}

/** 원조를 따질 만한 말 (흔한 대답·ㅋㅋ만 있는 말·민감한 말 제외) */
function jinxable(t: string): boolean {
  return t.length >= 2 && t.length <= 20 && !COMMON.has(t.toLowerCase()) && !laughOnly(t) && /[\p{L}\p{N}]/u.test(t) && !isSensitive(t);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * @param called 이 말에서 이름·별명이 불린 멤버 id (말한 사람 본인은 빼고)
 */
export function computeRecords(
  msgs: ChatMessage[],
  idOf: (m: ChatMessage) => string,
  ids: string[],
  called: (text: string, authorId: string) => string[],
): RecordStats {
  const last = new Map<string, { ts: number; index: number }>();
  const ghost = new Map<string, RecordStats["ghosts"][number]>();
  const pending = new Map<string, number>();
  const waits = new Map<string, number[]>(ids.map((id) => [id, []]));
  const jinx = new Map<string, { a: string; b: string; count: number; text: string }>();
  const work = new Map(ids.map((id) => [id, { messages: 0, work: 0 }]));
  const deleted = new Map(ids.map((id) => [id, 0]));
  const daily = new Map<string, number>();

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const id = idOf(m);
    const d = new Date(m.ts);
    daily.set(dateKey(m.ts), (daily.get(dateKey(m.ts)) ?? 0) + 1);

    // 근무 중 딴짓 (월~금 9~18시)
    const w = work.get(id)!;
    w.messages++;
    const wd = d.getUTCDay();
    const h = d.getUTCHours();
    if (wd >= 1 && wd <= 5 && h >= 9 && h < 18) w.work++;

    if (m.kind === "deleted") deleted.set(id, deleted.get(id)! + 1);

    // 잠수: 내 직전 말과의 간격. 그사이 쌓인 남의 말 = 인덱스 차이 - 1
    const prev = last.get(id);
    if (prev) {
      const missed = i - prev.index - 1;
      const days = Math.floor((m.ts - prev.ts) / DAY);
      const best = ghost.get(id);
      if (missed >= GHOST_MIN_MISSED && days >= 1 && (!best || m.ts - prev.ts > best.to - best.from)) {
        ghost.set(id, { memberId: id, days, from: prev.ts, to: m.ts, missed, text: m.kind === "text" ? example(m.text) : "" });
      }
    }
    last.set(id, { ts: m.ts, index: i });

    // 부르면 출동: 나를 부른 첫 호출부터 내가 말할 때까지
    const p = pending.get(id);
    if (p !== undefined) {
      if (m.ts - p <= SUMMON_CAP) waits.get(id)!.push(Math.round((m.ts - p) / 60_000));
      pending.delete(id);
    }
    if (m.kind === "text") {
      for (const c of called(m.text, id)) if (c !== id && !pending.has(c)) pending.set(c, m.ts);
    }

    // 텔레파시: 바로 앞 사람과 1분 안에 똑같은 말
    const before = msgs[i - 1];
    if (before && m.kind === "text" && before.kind === "text" && m.ts - before.ts <= JINX_WINDOW) {
      const bid = idOf(before);
      const t = norm(m.text);
      if (bid !== id && t === norm(before.text) && jinxable(t)) {
        const [a, b] = bid < id ? [bid, id] : [id, bid];
        const key = `${a}|${b}`;
        const j = jinx.get(key) ?? { a, b, count: 0, text: "" };
        j.count++;
        j.text = maskSensitive(t).text;
        jinx.set(key, j);
      }
    }
  }

  const allDays = [...daily.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, count]) => ({ date, count }));
  const lastDay = allDays.length ? Date.parse(`${allDays[allDays.length - 1].date}T00:00:00Z`) : 0;
  const since = dateKey(lastDay - CALENDAR_DAYS * DAY);

  let topJinx: RecordStats["jinx"] = null;
  for (const j of jinx.values()) if (j.count >= 2 && (!topJinx || j.count > topJinx.count)) topJinx = j;

  return {
    ghosts: [...ghost.values()],
    summons: ids.map((memberId) => {
      const ws = waits.get(memberId)!;
      return { memberId, calls: ws.length, median: ws.length ? median(ws) : 0 };
    }),
    jinx: topJinx,
    workHours: ids.map((memberId) => ({ memberId, ...work.get(memberId)! })),
    deleted: ids.map((memberId) => ({ memberId, count: deleted.get(memberId)! })),
    daily: allDays.filter((d) => d.date >= since),
    streak: longestStreak(allDays),
  };
}

/** 잠수로 보여줄 최소 기간 */
export const GHOST_MIN_DAYS = 3;
/** 부르면 출동 순위에 들려면 이만큼은 불려야 한다 */
export const SUMMON_MIN_CALLS = 5;
/** 근무 중 딴짓은 이 비율 이상만 재밌다 */
export const WORK_MIN_RATIO = 0.3;
export const DELETED_MIN = 3;

export function ghostRanking(r: RecordStats) {
  return r.ghosts.filter((g) => g.days >= GHOST_MIN_DAYS).sort((a, b) => b.to - b.from - (a.to - a.from));
}

export function summonRanking(r: RecordStats) {
  return r.summons.filter((s) => s.calls >= SUMMON_MIN_CALLS).sort((a, b) => a.median - b.median);
}

export function workRanking(r: RecordStats) {
  return r.workHours
    .filter((w) => w.messages >= MIN_SAMPLE && w.work / w.messages >= WORK_MIN_RATIO)
    .map((w) => ({ ...w, ratio: w.work / w.messages }))
    .sort((a, b) => b.ratio - a.ratio);
}

export function topDeleted(r: RecordStats) {
  let best: { memberId: string; count: number } | null = null;
  for (const d of r.deleted) if (d.count >= DELETED_MIN && (!best || d.count > best.count)) best = d;
  return best;
}

/**
 * 한쪽만 열심히 답하는 쌍: from 말에 to가 바로 이어 말한 횟수(replies[from][to])와 반대 방향 차이가 가장 큰 쌍.
 * 많이 답한 쪽이 20번 이상이고 반대보다 3배 이상일 때만.
 */
export function oneWayReply(replies: Record<string, Record<string, number>>) {
  let best: { from: string; to: string; count: number; back: number } | null = null;
  for (const [from, row] of Object.entries(replies)) {
    for (const [to, count] of Object.entries(row)) {
      if (from === to) continue;
      const back = replies[to]?.[from] ?? 0;
      if (count < 20 || count < back * 3) continue;
      if (!best || count - back > best.count - best.back) best = { from, to, count, back };
    }
  }
  return best;
}

/** 부르면 출동 시간 ("1분 안", "12분", "1시간 30분") */
export function waitLabel(min: number): string {
  if (min < 1) return "1분 안";
  const m = Math.round(min);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}시간 ${m % 60}분` : `${h}시간`;
}

/** 가장 오래 이어진 대화 연속 일수 */
export function longestStreak(daily: { date: string }[]): RecordStats["streak"] {
  let best: RecordStats["streak"] = null;
  let start = "";
  let prev = 0;
  let len = 0;
  for (const d of daily) {
    const t = Date.parse(`${d.date}T00:00:00Z`);
    if (len && t - prev === DAY) len++;
    else {
      len = 1;
      start = d.date;
    }
    prev = t;
    if (!best || len > best.days) best = { days: len, from: start, to: d.date };
  }
  return best;
}

/** 결과·AI 입력에 같이 쓰는 기록 조각. text는 한 줄 요약(AI 입력). 이름 뒤 조사가 필요 없게 쓴다 */
export interface RecordFact {
  key: "ghost" | "summon" | "jinx" | "work" | "deleted" | "oneway";
  label: string;
  value: string;
  caption: string;
  who: string[];
  /** who 사이를 →로 (한쪽 방향) */
  arrow?: boolean;
  /** 말풍선으로 보여줄 실제 한 줄 */
  quote?: string;
  text: string;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function recordFacts(
  r: RecordStats | undefined,
  replies: Record<string, Record<string, number>>,
  nameOf: (id: string) => string,
): RecordFact[] {
  const out: RecordFact[] = [];
  if (r) {
    const g = ghostRanking(r)[0];
    if (g) {
      out.push({
        key: "ghost", label: "잠수 기록", value: `${g.days}일`, caption: `그동안 방에 메시지 ${g.missed.toLocaleString()}개가 쌓였어요`,
        who: [g.memberId], quote: g.text || undefined,
        text: `잠수 기록 ${nameOf(g.memberId)}: ${g.days}일 동안 말이 없다가 돌아왔어요`,
      });
    }
    const s = summonRanking(r)[0];
    if (s) {
      out.push({
        key: "summon", label: "부르면 출동", value: waitLabel(s.median), caption: `이름이 불리고 말하기까지 걸린 시간 (${s.calls}번 중 중간값)`,
        who: [s.memberId], text: `부르면 출동 ${nameOf(s.memberId)}: 이름이 불리면 보통 ${waitLabel(s.median)} 만에 나타나요`,
      });
    }
    if (r.jinx) {
      const j = r.jinx;
      out.push({
        key: "jinx", label: "텔레파시", value: `${j.count}번`, caption: "1분 안에 똑같은 말을 친 횟수", who: [j.a, j.b], quote: j.text || undefined,
        text: `텔레파시 ${nameOf(j.a)} ↔ ${nameOf(j.b)}: 1분 안에 똑같은 말을 ${j.count}번 쳤어요`,
      });
    }
    const w = workRanking(r)[0];
    if (w) {
      out.push({
        key: "work", label: "근무 중 딴짓", value: pct(w.ratio), caption: "평일 9~18시에 보낸 메시지 비율", who: [w.memberId],
        text: `근무 중 딴짓 ${nameOf(w.memberId)}: 메시지의 ${pct(w.ratio)}를 평일 9~18시에 보냈어요`,
      });
    }
    const d = topDeleted(r);
    if (d) {
      out.push({
        key: "deleted", label: "메시지 지우개", value: `${d.count}개`, caption: "보냈다가 지운 메시지", who: [d.memberId],
        text: `메시지 지우개 ${nameOf(d.memberId)}: 보냈다가 지운 메시지 ${d.count}개`,
      });
    }
  }
  const o = oneWayReply(replies);
  if (o) {
    out.push({
      key: "oneway", label: "일방통행 답장", value: `${o.count} : ${o.back}`, caption: "앞사람 말에 뒷사람이 바로 답한 횟수 : 반대 방향",
      who: [o.from, o.to], arrow: true,
      text: `일방통행 답장 ${nameOf(o.from)} → ${nameOf(o.to)}: 앞사람 말에 뒷사람이 바로 답한 횟수 ${o.count}번, 반대는 ${o.back}번`,
    });
  }
  return out;
}
