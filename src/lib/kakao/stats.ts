import type { ChatMessage } from "./types";
import type { MemberGroup } from "./members";
import { authorIndex } from "./members";

const DAY = 86_400_000;
const REPLY_WINDOW = 10 * 60_000; // 10분 안의 다음 발화자를 "답장"으로 본다
const SILENCE = 3 * 3_600_000; // 3시간 이상 조용해지면 "대화를 끝낸 말"

export interface MemberStats {
  id: string;
  messages: number;
  share: number;
  avgLength: number;
  laughPerMessage: number;
  questions: number;
  emoticons: number;
  photos: number;
  links: number;
  hours: number[]; // 24칸
  weekdays: number[]; // 0=일
  activeDays: number;
  firstOfDay: number;
  lastWord: number;
  nightRatio: number; // 22시~2시 비율
  catchphrases: { text: string; count: number }[];
}

export interface HiddenRecords {
  longestMessage: { memberId: string; ts: number; length: number; preview: string } | null;
  lateNightMonologue: { memberId: string; ts: number; count: number; minutes: number } | null;
  repeatStreak: { memberId: string; ts: number; text: string; count: number } | null;
  topLastWord: { memberId: string; count: number } | null;
}

export interface RoomStats {
  totalMessages: number;
  start: number;
  end: number;
  days: number;
  byMonth: { month: string; count: number }[];
  busiestDay: { date: string; count: number } | null;
  hours: number[];
  members: MemberStats[];
  /** replies[a][b] = a가 말한 직후(10분 내) b가 이어 말한 횟수 */
  replies: Record<string, Record<string, number>>;
  /** mentions[a][b] = a가 b의 이름·별명을 부른 횟수 */
  mentions: Record<string, Record<string, number>>;
  hidden: HiddenRecords;
}

const MEDIA = new Set(["photo", "video", "emoticon", "file", "deleted"]);
const dateKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/** 멤버 이름에서 다른 사람이 부를 법한 호칭을 뽑는다. ("홍길동 길동이" → 홍길동, 길동, 길동이) */
export function callNames(group: MemberGroup, extra: string[] = []): string[] {
  const out = new Set<string>(extra);
  for (const n of group.names) {
    for (const w of n.split(/\s+/)) {
      if (!w) continue;
      out.add(w);
      if (/^[가-힣]{3}$/.test(w)) out.add(w.slice(1)); // 성 뺀 이름
    }
  }
  return [...out].filter((w) => w.length >= 1);
}

export function computeStats(
  messages: ChatMessage[],
  groups: MemberGroup[],
  aliases: Record<string, string[]> = {},
): RoomStats {
  const idx = authorIndex(groups);
  const people = groups.filter((g) => !g.isBot);
  const ids = people.map((g) => g.id);
  const msgs = messages.filter((m) => ids.includes(idx.get(m.author) ?? ""));

  const per = new Map<string, MemberStats & { _len: number; _laugh: number; _days: Set<string>; _phr: Map<string, number> }>();
  for (const id of ids) {
    per.set(id, {
      id, messages: 0, share: 0, avgLength: 0, laughPerMessage: 0, questions: 0,
      emoticons: 0, photos: 0, links: 0, hours: Array(24).fill(0), weekdays: Array(7).fill(0),
      activeDays: 0, firstOfDay: 0, lastWord: 0, nightRatio: 0, catchphrases: [],
      _len: 0, _laugh: 0, _days: new Set(), _phr: new Map(),
    });
  }
  const replies: RoomStats["replies"] = Object.fromEntries(ids.map((a) => [a, Object.fromEntries(ids.map((b) => [b, 0]))]));
  const mentions: RoomStats["mentions"] = Object.fromEntries(ids.map((a) => [a, Object.fromEntries(ids.map((b) => [b, 0]))]));
  const calls = people.map((g) => ({ id: g.id, words: callNames(g, aliases[g.id]) }));

  const byMonth = new Map<string, number>();
  const byDay = new Map<string, number>();
  const hours = Array(24).fill(0);
  const hidden: HiddenRecords = { longestMessage: null, lateNightMonologue: null, repeatStreak: null, topLastWord: null };

  let prevDay = "";
  let run: { id: string; text: string; count: number; ts: number } | null = null;
  let night: { id: string; count: number; ts: number; last: number } | null = null;

  msgs.forEach((m, i) => {
    const id = idx.get(m.author)!;
    const s = per.get(id)!;
    const d = new Date(m.ts);
    const h = d.getUTCHours();
    const day = dateKey(m.ts);

    s.messages++;
    s.hours[h]++;
    s.weekdays[d.getUTCDay()]++;
    s._days.add(day);
    hours[h]++;
    byMonth.set(day.slice(0, 7), (byMonth.get(day.slice(0, 7)) ?? 0) + 1);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    if (day !== prevDay) { s.firstOfDay++; prevDay = day; }

    if (m.kind === "emoticon") s.emoticons++;
    else if (m.kind === "photo" || m.kind === "video") s.photos++;
    else if (m.kind === "link") s.links++;

    if (!MEDIA.has(m.kind)) {
      const t = m.text.trim();
      s._len += t.length;
      s._laugh += (t.match(/ㅋ/g) ?? []).length;
      if (/[?？]\s*$/.test(t)) s.questions++;
      if (t.length > 0 && t.length <= 10 && m.kind === "text") s._phr.set(t, (s._phr.get(t) ?? 0) + 1);
      for (const c of calls) {
        if (c.id !== id && c.words.some((w) => t.includes(w))) mentions[id][c.id]++;
      }
      if (m.kind === "text" && (!hidden.longestMessage || t.length > hidden.longestMessage.length)) {
        hidden.longestMessage = { memberId: id, ts: m.ts, length: t.length, preview: t.slice(0, 40) };
      }
    }

    const next = msgs[i + 1];
    if (next) {
      const nid = idx.get(next.author)!;
      if (nid !== id && next.ts - m.ts <= REPLY_WINDOW) replies[id][nid]++;
      if (next.ts - m.ts >= SILENCE) s.lastWord++;
    }

    // 같은 말 연속 반복
    if (run && run.id === id && run.text === m.text && m.kind === "text") run.count++;
    else run = { id, text: m.text, count: 1, ts: m.ts };
    if (run.count >= 3 && (!hidden.repeatStreak || run.count > hidden.repeatStreak.count)) {
      hidden.repeatStreak = { memberId: id, ts: run.ts, text: run.text.slice(0, 20), count: run.count };
    }

    // 새벽(2~5시) 혼자 이어간 독백
    if (h >= 2 && h < 6) {
      if (night && night.id === id && m.ts - night.last < 60 * 60_000) { night.count++; night.last = m.ts; }
      else night = { id, count: 1, ts: m.ts, last: m.ts };
      if (night.count >= 5 && (!hidden.lateNightMonologue || night.count > hidden.lateNightMonologue.count)) {
        hidden.lateNightMonologue = {
          memberId: id, ts: night.ts, count: night.count,
          minutes: Math.round((night.last - night.ts) / 60_000),
        };
      }
    } else night = null;
  });

  const total = msgs.length;
  const members: MemberStats[] = [...per.values()].map((s) => {
    const textCount = s.messages - s.emoticons - s.photos;
    const { _len, _laugh, _days, _phr, ...rest } = s;
    return {
      ...rest,
      share: total ? s.messages / total : 0,
      avgLength: textCount > 0 ? _len / textCount : 0,
      laughPerMessage: textCount > 0 ? _laugh / textCount : 0,
      activeDays: _days.size,
      nightRatio: s.messages ? (s.hours[22] + s.hours[23] + s.hours[0] + s.hours[1]) / s.messages : 0,
      catchphrases: [..._phr.entries()]
        .filter(([t]) => !/^ㅋ+$|^ㅎ+$/.test(t))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([text, count]) => ({ text, count })),
    };
  }).sort((a, b) => b.messages - a.messages);

  const topLast = [...members].sort((a, b) => b.lastWord - a.lastWord)[0];
  hidden.topLastWord = topLast ? { memberId: topLast.id, count: topLast.lastWord } : null;

  const busiest = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const start = msgs[0]?.ts ?? 0;
  const end = msgs[msgs.length - 1]?.ts ?? 0;

  return {
    totalMessages: total,
    start,
    end,
    days: total ? Math.floor((Date.UTC(...ymd(end)) - Date.UTC(...ymd(start))) / DAY) + 1 : 0,
    byMonth: [...byMonth.entries()].sort().map(([month, count]) => ({ month, count })),
    busiestDay: busiest ? { date: busiest[0], count: busiest[1] } : null,
    hours,
    members,
    replies,
    mentions,
    hidden,
  };
}

function ymd(ts: number): [number, number, number] {
  const d = new Date(ts);
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}
