import { describe, expect, it } from "vitest";
import { bestPerNickname, cleanNickname, resultLabel, type RankRow } from "./ranking";

const row = (nickname: string, score: number, createdAt: string, correct: number | null = null): RankRow => ({
  nickname,
  memberName: null,
  score,
  correct,
  total: correct === null ? null : 10,
  createdAt,
});

describe("퀴즈 결과 목록", () => {
  it("같은 이름은 최고 기록 하나만, 동점이면 먼저 푼 기록", () => {
    const rows = bestPerNickname([
      row("도토리", 60, "2026-10-01T00:00:00Z", 6),
      row("도토리", 80, "2026-10-02T00:00:00Z", 8),
      row("고등어", 80, "2026-10-01T12:00:00Z", 8),
      row("감자", 90, "2026-10-03T00:00:00Z", 9),
      row("고등어", 80, "2026-10-04T00:00:00Z", 8),
    ]);
    expect(rows.map((r) => [r.nickname, r.score])).toEqual([
      ["감자", 90],
      ["고등어", 80],
      ["도토리", 80],
    ]);
    expect(rows[1].createdAt).toBe("2026-10-01T12:00:00Z");
  });

  it("이름은 대소문자 구분 없이 같은 사람으로 본다", () => {
    expect(bestPerNickname([row("Gana", 10, "a"), row("gana", 20, "b")])).toHaveLength(1);
  });

  it("개수 기록이 있든 없든 점수로 표시", () => {
    const withCounts: RankRow = { nickname: "도토리", memberName: null, score: 80, correct: 8, total: 10, createdAt: "" };
    const legacy: RankRow = { ...withCounts, correct: null, total: null };
    expect(resultLabel(withCounts)).toBe("80점");
    expect(resultLabel(legacy)).toBe("80점");
  });

  it("이름 정리: 공백 정리, 20자 제한", () => {
    expect(cleanNickname("  도토리   김 ")).toBe("도토리 김");
    expect(cleanNickname("가".repeat(30))).toHaveLength(20);
  });
});
