import type { RoomStats } from "./stats";
import { isSensitive } from "../quiz/sensitive";
import { funLines } from "./fun";

/**
 * AI 분석을 기다리는 동안 돌려 보여줄 "미리 보기" 한 줄들.
 * 브라우저에서 이미 센 통계만 쓴다 (원문 문장은 말버릇·연타 같은 짧은 말만).
 */
export function buildTeasers(stats: RoomStats, nameOf: (id: string) => string): string[] {
  const out: string[] = [];
  const n = (v: number) => v.toLocaleString("ko-KR");
  const ranked = [...stats.members].sort((a, b) => b.messages - a.messages);
  const top = ranked[0];
  if (top) out.push(`수다왕 후보: ${nameOf(top.id)}, 메시지 ${n(top.messages)}개`);

  let peak = 0;
  for (let h = 1; h < 24; h++) if (stats.hours[h] > stats.hours[peak]) peak = h;
  if (stats.hours[peak] > 0) out.push(`이 방이 제일 시끄러운 시간은 ${peak}시예요`);

  if (stats.busiestDay) out.push(`가장 뜨거웠던 날은 ${stats.busiestDay.date}, 하루 ${n(stats.busiestDay.count)}개`);

  for (const m of ranked.slice(0, 4)) {
    const c = m.catchphrases.find((x) => /[\p{L}\p{N}]/u.test(x.text) && !isSensitive(x.text));
    if (c) out.push(`${nameOf(m.id)}의 말버릇 ‘${c.text.trim()}’ ${n(c.count)}번`);
  }

  const owl = [...stats.members].sort((a, b) => b.nightRatio - a.nightRatio)[0];
  if (owl && owl.nightRatio > 0.1) out.push(`밤 10시~새벽 2시 담당은 ${nameOf(owl.id)} (${Math.round(owl.nightRatio * 100)}%)`);

  const h = stats.hidden;
  if (h.longestMessage) out.push(`가장 긴 메시지는 ${n(h.longestMessage.length)}자 · ${nameOf(h.longestMessage.memberId)}`);
  if (h.repeatStreak && !isSensitive(h.repeatStreak.text)) out.push(`같은 말 ${n(h.repeatStreak.count)}연타 · ${nameOf(h.repeatStreak.memberId)}`);
  if (h.topLastWord) out.push(`대화를 제일 많이 끝낸 사람은 ${nameOf(h.topLastWord.memberId)}`);
  out.push(...funLines(stats.fun, nameOf));
  return out;
}
