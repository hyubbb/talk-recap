import { describe, expect, it } from "vitest";
import { buildSlides, inkOn, safePair } from "./slides";
import { fakeReport } from "../testing/fakeReport";

describe("buildSlides", () => {
  it("기본 12종이 PRD 순서대로, 멤버는 1인 1장", () => {
    const r = fakeReport(3);
    const s = buildSlides(r);
    const kinds = [...new Set(s.map((x) => x.kind))];
    expect(kinds).toEqual(["opening", "ranking", "catchphrase", "hours", "hidden", "acts", "member", "pair", "mbti", "awards", "bag", "closing"]);
    expect(s.filter((x) => x.kind === "member")).toHaveLength(3);
    expect(new Set(s.map((x) => x.id)).size).toBe(s.length);
    for (const x of s) expect(x.title.length).toBeGreaterThan(0);
  });

  it("가방 장은 내가 고른 멤버", () => {
    const s = buildSlides(fakeReport(3), "감자");
    expect(s.find((x) => x.kind === "bag")?.member).toBe("감자");
  });

  it("민감한 궁합은 스토리에서 뺀다", () => {
    const r = fakeReport(2);
    r.report.pairs = [{ a: "도토리", b: "고등어", score: 99, label: "썸", reason: "고백 각" }];
    expect(safePair(r)).toBeUndefined();
    expect(buildSlides(r).some((x) => x.kind === "pair")).toBe(false);
  });

  it("배경이 밝으면 어두운 글자", () => {
    expect(inkOn("#ffc53d")).toBe("#17142e");
    expect(inkOn("#17142e")).toBe("#f3efff");
  });
});
