import { describe, expect, it } from "vitest";
import { canObject, ownerOfTarget, statusOf, voteThreshold } from "./rules";
import { fakeReport } from "../testing/fakeReport";

describe("반박권", () => {
  const r = fakeReport(4).report;

  it("당사자만 반박할 수 있다", () => {
    expect(canObject(r, "member:도토리", "도토리")).toBe(true);
    expect(canObject(r, "mbti:도토리", "고등어")).toBe(false);
    expect(canObject(r, "award:0", "도토리")).toBe(true);
    expect(canObject(r, "award:0", "감자")).toBe(false);
    expect(canObject(r, "member:도토리", null)).toBe(false);
  });

  it("잘못된 대상", () => {
    expect(ownerOfTarget(r, "award:9")).toBeNull();
    expect(ownerOfTarget(r, "member:없는사람")).toBeNull();
    expect(ownerOfTarget(r, "hack:도토리")).toBeNull();
  });

  it("반박한 사람을 뺀 과반", () => {
    expect(voteThreshold(2)).toBe(1);
    expect(voteThreshold(4)).toBe(2); // 다른 3명 중 2명
    expect(voteThreshold(5)).toBe(3); // 다른 4명 중 3명
    expect(statusOf(2, 0, 4)).toBe("accepted");
    expect(statusOf(1, 1, 4)).toBe("open");
    expect(statusOf(0, 2, 4)).toBe("rejected");
  });
});
