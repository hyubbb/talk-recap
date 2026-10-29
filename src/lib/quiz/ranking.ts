/** 퀴즈 결과 한 줄. correct/total은 0003 마이그레이션 전 기록이면 null */
export interface RankRow {
  nickname: string;
  memberName: string | null;
  score: number;
  correct: number | null;
  total: number | null;
  createdAt: string;
}

export const NICKNAME_MAX = 20;

/** 닉네임 정리: 앞뒤 공백 제거, 연속 공백 하나로, 최대 20자 */
export function cleanNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, NICKNAME_MAX);
}

/**
 * 같은 닉네임은 가장 좋은 기록 하나만 남기고(동점이면 먼저 푼 기록),
 * 점수 높은 순 → 먼저 푼 순으로 정렬한다.
 */
export function bestPerNickname(rows: RankRow[], limit = 20): RankRow[] {
  const best = new Map<string, RankRow>();
  for (const r of rows) {
    const key = r.nickname.toLowerCase();
    const cur = best.get(key);
    if (!cur || r.score > cur.score || (r.score === cur.score && r.createdAt < cur.createdAt)) best.set(key, r);
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit);
}

/** 순위표 표기: 항상 "80점". 개수(correct/total)는 저장만 하고 표시는 점수로 통일한다 (예전 기록도 score는 있어서 그대로 보인다) */
export function resultLabel(r: Pick<RankRow, "score">): string {
  return `${r.score}점`;
}
