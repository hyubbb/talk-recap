import { describe, expect, it } from "vitest";
import { requireCompleteChunks } from "./completion";

describe("구간 분석 완료 조건", () => {
  it("일부 구간이 실패하면 종합 단계로 넘기지 않는다", () => {
    expect(() => requireCompleteChunks(["첫 구간", null, "셋째 구간"])).toThrow("1개 구간 분석이 실패했어요");
  });

  it("모든 구간이 실패한 경우도 오류로 알린다", () => {
    expect(() => requireCompleteChunks([null, null])).toThrow("모든 구간 분석이 실패했어요");
  });

  it("모든 구간이 끝나야 전체 노트를 돌려준다", () => {
    expect(requireCompleteChunks(["첫 구간", "둘째 구간"])).toEqual(["첫 구간", "둘째 구간"]);
  });
});
