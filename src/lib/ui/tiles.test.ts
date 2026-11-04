import { describe, expect, it } from "vitest";
import { wideLayout } from "./tiles";

const t = (...wide: boolean[]) => wide.map((w) => ({ wide: w }));

describe("wideLayout", () => {
  it("반 칸 둘은 한 줄에 나란히", () => {
    expect(wideLayout(t(false, false))).toEqual([false, false]);
  });

  it("넓은 타일 앞에 혼자 남은 반 칸은 한 줄로 늘린다", () => {
    // 웃음 버튼 · 랠리(넓음) · 유행어(넓음) · 분위기 메이커
    expect(wideLayout(t(false, true, true, false))).toEqual([true, true, true, true]);
  });

  it("홀수 개면 마지막 반 칸만 늘린다", () => {
    expect(wideLayout(t(false, false, false))).toEqual([false, false, true]);
  });

  it("넓은 타일 뒤에서 다시 짝을 맞춘다", () => {
    expect(wideLayout(t(true, false, false, false, true))).toEqual([true, false, false, true, true]);
  });

  it("빈 목록", () => {
    expect(wideLayout([])).toEqual([]);
  });
});
