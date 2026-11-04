import { describe, expect, it } from "vitest";
import { buildTeasers } from "./teasers";
import { fakeReport } from "../testing/fakeReport";

describe("buildTeasers", () => {
  it("통계로 미리 보기 문장을 만들고 민감한 말버릇은 뺀다", () => {
    const { stats, members } = fakeReport(3);
    stats.members[0].catchphrases = [
      { text: "병원 가야돼", count: 9 },
      { text: "배고파", count: 5 },
    ];
    const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "";
    const t = buildTeasers(stats, nameOf);
    expect(t.some((x) => x.startsWith("수다왕 후보:"))).toBe(true);
    expect(t.some((x) => x.includes("‘배고파’ 5번"))).toBe(true);
    expect(t.join(" ")).not.toContain("병원");
  });
});
