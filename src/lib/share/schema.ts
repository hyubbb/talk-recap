import { z } from "zod";
import { reportSchema } from "../llm/schema";

/** 공유 요청 본문 상한 */
export const MAX_SHARE_BYTES = 500 * 1024;

const num = z.number().finite();
const counts = z.array(num);
const matrix = z.record(z.string(), z.record(z.string(), num));

const memberStats = z.object({
  id: z.string().max(100),
  messages: num,
  share: num,
  avgLength: num,
  laughPerMessage: num,
  questions: num,
  emoticons: num,
  photos: num,
  links: num,
  hours: counts.max(24),
  weekdays: counts.max(7),
  activeDays: num,
  firstOfDay: num,
  lastWord: num,
  nightRatio: num,
  catchphrases: z.array(z.object({ text: z.string().max(200), count: num })).max(50),
});

/** src/lib/kakao/fun.ts FunStats. 이 기능 전에 만든 결과엔 없다 */
const mid = z.string().max(100);
const funStats = z.object({
  laughs: z.array(z.object({ memberId: mid, attempts: num, triggers: num, ratio: num })).max(100),
  unanswered: z.array(z.object({ memberId: mid, turns: num, count: num, ratio: num })).max(100),
  loneliest: z.object({ memberId: mid, ts: num, text: z.string().max(200), minutes: num }).nullable(),
  rally: z.object({ a: mid, b: mid, turns: num, ts: num, minutes: num }).nullable(),
  laughLength: z.array(z.object({ month: z.string().max(20), avg: num })).max(1200),
  origins: z
    .array(z.object({ text: z.string().max(200), spread: z.array(z.object({ memberId: mid, ts: num, count: num })).max(100) }))
    .max(5),
  mood: z.array(z.object({ memberId: mid, withAvg: num, withoutAvg: num, withDays: num, withoutDays: num })).max(100),
});

/** src/lib/kakao/records.ts RecordStats. 이 기능 전에 만든 결과엔 없다 */
const recordStats = z.object({
  ghosts: z.array(z.object({ memberId: mid, days: num, from: num, to: num, missed: num, text: z.string().max(200) })).max(100),
  summons: z.array(z.object({ memberId: mid, calls: num, median: num })).max(100),
  jinx: z.object({ a: mid, b: mid, count: num, text: z.string().max(200) }).nullable(),
  workHours: z.array(z.object({ memberId: mid, messages: num, work: num })).max(100),
  deleted: z.array(z.object({ memberId: mid, count: num })).max(100),
  daily: z.array(z.object({ date: z.string().max(20), count: num })).max(400),
  streak: z.object({ days: num, from: z.string().max(20), to: z.string().max(20) }).nullable(),
});

const roomStats = z.object({
  totalMessages: num,
  start: num,
  end: num,
  days: num,
  byMonth: z.array(z.object({ month: z.string().max(20), count: num })).max(1200),
  busiestDay: z.object({ date: z.string().max(20), count: num }).nullable(),
  hours: counts.max(24),
  members: z.array(memberStats).max(100),
  replies: matrix,
  mentions: matrix,
  hidden: z.object({
    longestMessage: z.object({ memberId: z.string(), ts: num, length: num, preview: z.string().max(500) }).nullable(),
    lateNightMonologue: z.object({ memberId: z.string(), ts: num, count: num, minutes: num }).nullable(),
    repeatStreak: z.object({ memberId: z.string(), ts: num, text: z.string().max(500), count: num }).nullable(),
    topLastWord: z.object({ memberId: z.string(), count: num }).nullable(),
  }),
  fun: funStats.optional(),
  records: recordStats.optional(),
});

const s = (max: number) => z.string().max(max);
const quote = z.object({ date: s(20), who: s(60), text: s(1000) });
const block = z.object({ title: s(200), text: s(3000), quotes: z.array(quote).max(5) });

/**
 * 공유받을 리포트: 지금 모양(reportSchema)이 기본이고, 예전 버전에서 만든 결과도 공유할 수 있게
 * 새로 생긴 칸(한줄평·명장면·꼭지·어워드 인용·사전)은 없어도 받고, 예전 칸(변화·스트레스·챙김)도 받는다.
 * 읽을 때 normalizeReport로 지금 모양으로 맞춘다.
 */
const memberShape = reportSchema.shape.members.element;
const sharedReportSchema = reportSchema.extend({
  members: z.array(
    memberShape.extend({
      oneLiner: s(500).optional(),
      scenes: z.array(block).max(5).optional(),
      sections: z.array(block).max(6).optional(),
      change: s(3000).optional(),
      stress: s(3000).optional(),
      care: s(3000).optional(),
    }),
  ),
  awards: z.array(reportSchema.shape.awards.element.extend({ quotes: z.array(quote).max(3).optional() })),
  dictionary: z.array(z.object({ word: s(40), meaning: s(500), quotes: z.array(quote).max(3) })).max(10).optional(),
});

const contextLine = z.object({ date: s(10), time: s(5), who: s(60), text: s(400) });
const contextBlock = z.object({ lines: z.array(contextLine).max(7), focus: z.number().int().min(0).max(6) });
/** 근거 문맥은 결과에 쓰인 인용 수만큼만 (넉넉히 400개) */
const contexts = z
  .record(s(1200), contextBlock)
  .refine((r) => Object.keys(r).length <= 400, "문맥이 너무 많아요");
const phrases = z
  .record(s(100), z.array(z.object({ text: s(200), count: num, context: contextBlock.nullable() })).max(10))
  .refine((r) => Object.keys(r).length <= 100);

/** `SavedReport`(src/lib/report/storage.ts)와 같은 모양 */
export const savedReportSchema = z.object({
  id: z.string().max(100),
  createdAt: num,
  provider: z.string().max(40),
  members: z
    .array(z.object({ id: z.string().max(100), name: z.string().max(60), color: z.string().max(40) }))
    .min(1)
    .max(100),
  stats: roomStats,
  report: sharedReportSchema,
  usage: z.object({ input: num, output: num }),
  droppedQuotes: num,
  contexts: contexts.optional(),
  phrases: phrases.optional(),
});

/** 업로더 브라우저에 보관하는 공유 정보 */
export interface ShareInfo {
  id: string;
  url: string;
  deleteToken: string;
  expiresAt: string;
}
