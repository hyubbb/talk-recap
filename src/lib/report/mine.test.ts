import { describe, expect, it } from "vitest";
import { myFacts } from "./mine";
import { fakeReport } from "../testing/fakeReport";

describe("myFacts", () => {
  it("순위·단짝·시간·말버릇·웃음·잠수·출동을 나 기준으로", () => {
    const r = fakeReport(3);
    r.stats.replies = { m1: { m2: 3, m3: 9 }, m2: { m1: 4 }, m3: { m1: 1 } };
    r.stats.members[1].hours = Array.from({ length: 24 }, (_, h) => (h === 22 ? 50 : 1));
    const facts = myFacts(r.stats, "m2");
    const by = Object.fromEntries(facts.map((f) => [f.key, f]));
    expect(by.rank.value).toBe("2위");
    expect(by.buddy).toMatchObject({ value: "7번", who: ["m2", "m1"] });
    expect(by.peak.value).toBe("22시");
    expect(by.phrase.value).toBe("‘넵’");
    expect(by.laugh.caption).toContain("방에서 2위");
    expect(by.ghost.value).toBe("7일");
    expect(by.summon.value).toBe("11분");
  });

  it("예전 결과(fun·records 없음)는 통계 기록만, 없는 멤버는 빈 목록", () => {
    const r = fakeReport(2);
    delete r.stats.fun;
    delete r.stats.records;
    expect(myFacts(r.stats, "m1").map((f) => f.key)).toEqual(["rank", "peak", "phrase", "opener", "closer"]);
    expect(myFacts(r.stats, "없는 사람")).toEqual([]);
  });

  it("민감한 말버릇은 건너뛴다", () => {
    const r = fakeReport(1);
    r.stats.members[0].catchphrases = [{ text: "병원 가야돼", count: 9 }, { text: "가보자고", count: 3 }];
    expect(myFacts(r.stats, "m1").find((f) => f.key === "phrase")?.value).toBe("‘가보자고’");
  });
});
