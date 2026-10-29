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
});

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
  report: reportSchema,
  usage: z.object({ input: num, output: num }),
  droppedQuotes: num,
});

/** 업로더 브라우저에 보관하는 공유 정보 */
export interface ShareInfo {
  id: string;
  url: string;
  deleteToken: string;
  expiresAt: string;
}
