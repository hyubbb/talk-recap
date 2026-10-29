import { describe, expect, it } from "vitest";
import { bagPrompt, facePrompt, groupPrompt, roomPrompt } from "./build";
import { fakeReport } from "../testing/fakeReport";

describe("이미지 프롬프트", () => {
  const r = fakeReport(3).report;
  const m = r.members[0];

  it("스타일 고정과 실존 인물 회피 문구", () => {
    expect(facePrompt(m)).toMatch(/webtoon/i);
    expect(roomPrompt(m)).toMatch(/isometric/i);
    expect(bagPrompt(m)).toMatch(/pixel art/i);
    for (const p of [facePrompt(m), roomPrompt(m), bagPrompt(m), groupPrompt(r)]) {
      expect(p).toMatch(/not photorealistic/i);
      expect(p).toMatch(/no celebrity likeness/i);
    }
  });

  it("멤버 실명과 인용은 넣지 않는다", () => {
    for (const p of [facePrompt(m), roomPrompt(m), bagPrompt(m), groupPrompt(r)]) {
      for (const x of r.members) {
        expect(p).not.toContain(x.name);
        for (const q of x.quotes) expect(p).not.toContain(q.text);
      }
    }
  });

  it("가방 물건이 들어간다", () => {
    expect(bagPrompt(m)).toContain("컵라면");
    expect(groupPrompt(r)).toContain("3 fictional friends");
  });
});
