import type { RoomStats } from "@/lib/kakao/stats";

const fmt = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function periodLabel(stats: RoomStats): string {
  return `${fmt(stats.start)}~${fmt(stats.end)}`;
}

/**
 * 종합 단계 LLM에 넘길 통계 요약 (사람이 읽을 수 있는 텍스트).
 * 숫자는 코드가 계산한 값이라 LLM이 지어내지 않게 그대로 쓰라고 지시한다.
 */
export function statsDigest(stats: RoomStats, nameOf: (id: string) => string): string {
  const lines: string[] = [];
  lines.push(`기간: ${periodLabel(stats)} (${stats.days}일), 메시지 ${stats.totalMessages.toLocaleString()}개`);
  if (stats.busiestDay) lines.push(`가장 시끄러운 날: ${stats.busiestDay.date} (${stats.busiestDay.count}개)`);
  lines.push("멤버별:");
  for (const m of stats.members) {
    const peak = m.hours.indexOf(Math.max(...m.hours));
    lines.push(
      `- ${nameOf(m.id)}: 메시지 ${m.messages.toLocaleString()}개(${pct(m.share)}), 평균 ${m.avgLength.toFixed(1)}자, ` +
        `ㅋ ${m.laughPerMessage.toFixed(2)}개/메시지, 질문 ${m.questions}개, 이모티콘 ${m.emoticons}개, 사진 ${m.photos}개, ` +
        `밤(22~2시) ${pct(m.nightRatio)}, 가장 활발한 시간 ${peak}시, 그날 첫 마디 ${m.firstOfDay}번, 대화 끝낸 횟수 ${m.lastWord}번, ` +
        `말버릇 ${m.catchphrases.slice(0, 5).map((c) => `"${c.text}" ${c.count}번`).join(", ")}`,
    );
  }
  const pairs: string[] = [];
  for (const [a, row] of Object.entries(stats.replies)) {
    for (const [b, n] of Object.entries(row)) if (a < b) pairs.push(`${nameOf(a)}↔${nameOf(b)} ${n + (stats.replies[b]?.[a] ?? 0)}`);
  }
  lines.push(`서로 주고받은 답장 수: ${pairs.join(", ")}`);
  const ments: string[] = [];
  for (const [a, row] of Object.entries(stats.mentions)) {
    for (const [b, n] of Object.entries(row)) if (n > 0) ments.push(`${nameOf(a)}→${nameOf(b)} ${n}`);
  }
  if (ments.length) lines.push(`이름·별명 부른 횟수: ${ments.join(", ")}`);
  const h = stats.hidden;
  if (h.repeatStreak) lines.push(`같은 말 연속 최고: ${nameOf(h.repeatStreak.memberId)} ${h.repeatStreak.count}번`);
  if (h.longestMessage) lines.push(`가장 긴 메시지: ${nameOf(h.longestMessage.memberId)} ${h.longestMessage.length}자`);
  return lines.join("\n");
}
