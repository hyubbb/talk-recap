import { describe, expect, it } from "vitest";
import { normalizeReport, unquote } from "./normalize";
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

describe("한줄평 따옴표", () => {
  it("겉을 감싼 따옴표는 격격이 벗기고 안쪽 따옴표는 둔다", () => {
    expect(unquote("“'나 없으면 산행 톤 다운됨'”")).toBe("나 없으면 산행 톤 다운됨");
    expect(unquote('"퇴사하고도 단톡방 지분 1위"')).toBe("퇴사하고도 단톡방 지분 1위");
    expect(unquote("도토리의 '흠' 장인")).toBe("도토리의 '흠' 장인");
    expect(unquote("'흠' 장인 '흠'")).toBe("'흠' 장인 '흠'");
  });

  it("저장된 결과를 읽을 때 멤버 한줄평에서 따옴표를 벗긴다", () => {
    const r = fakeReport(1).report;
    r.members[0].oneLiner = "'일정왕'";
    r.members[0].archetype = "“강단 있는 일정왕”";
    const m = normalizeReport(r).members[0];
    expect(m.oneLiner).toBe("일정왕");
    expect(m.archetype).toBe("강단 있는 일정왕");
  });
});
