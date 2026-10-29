import { describe, expect, it } from "vitest";
import { normalizeReport } from "./normalize";
import { fakeReport } from "../testing/fakeReport";
import type { Report } from "../llm/schema";

describe("예전 결과 맞추기", () => {
  it("예전 칸(변화·유머·스트레스·챙김)은 꼭지로, 없는 칸은 빈 값으로", () => {
    const r = fakeReport(2).report;
    const legacy = {
      ...r,
      members: r.members.map(({ name, archetype, summary, quotes, mbti, bag }) => ({
        name, archetype, summary, quotes, mbti, bag, change: "변함", humor: "드립", stress: "한숨", care: "챙김",
      })),
      awards: r.awards.map(({ title, winner, reason }) => ({ title, winner, reason })),
    } as unknown as Report;
    const n = normalizeReport(legacy);
    expect(n.members[0].sections.map((s) => s.title)).toEqual(["변화", "유머", "스트레스 받을 때", "챙기는 방식"]);
    expect(n.members[0].scenes).toEqual([]);
    expect(n.members[0].oneLiner).toBe("");
    expect(n.awards[0].quotes).toEqual([]);
  });

  it("지금 모양은 그대로", () => {
    const r = fakeReport(2).report;
    expect(normalizeReport(r).members[0]).toBe(r.members[0]);
  });
});
