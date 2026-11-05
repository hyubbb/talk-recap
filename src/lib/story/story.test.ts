import { describe, expect, it } from "vitest";
import { buildSlides, inkOn, relatedWords, replayScene, safePair, topResponders } from "./slides";
import { quoteKey } from "../report/context";
import { fakeReport } from "../testing/fakeReport";

describe("buildSlides", () => {
  it("기본 12종이 PRD 순서대로, 멤버는 1인 1장", () => {
    const r = fakeReport(3);
    const s = buildSlides(r);
    const kinds = [...new Set(s.map((x) => x.kind))];
    expect(kinds).toEqual([
      "opening", "ranking", "catchphrase", "origin", "hours", "duty", "laugh", "lonely", "ghost", "rally", "jinx", "mood",
      "summon", "hidden", "acts", "member", "pair", "mbti", "awards", "bag", "closing",
    ]);
    expect(s.filter((x) => x.kind === "member")).toHaveLength(3);
    expect(new Set(s.map((x) => x.id)).size).toBe(s.length);
    for (const x of s) expect(x.title.length).toBeGreaterThan(0);
  });

  it("예전 결과(fun·records 없음)는 새 분석 장 없이 기존 순서 그대로", () => {
    const r = fakeReport(3);
    delete r.stats.fun;
    delete r.stats.records;
    const kinds = [...new Set(buildSlides(r).map((x) => x.kind))];
    expect(kinds).toEqual(["opening", "ranking", "catchphrase", "hours", "duty", "hidden", "acts", "member", "pair", "mbti", "awards", "bag", "closing"]);
  });

  it("표본이 적거나 비율이 낮은 웃음·허공은 장을 만들지 않는다", () => {
    const r = fakeReport(3);
    r.stats.fun!.laughs = r.stats.fun!.laughs.map((l) => ({ ...l, attempts: 5 }));
    r.stats.fun!.unanswered = r.stats.fun!.unanswered.map((u) => ({ ...u, count: 3, ratio: 0.01 }));
    r.stats.fun!.loneliest = null;
    const kinds = buildSlides(r).map((x) => x.kind);
    expect(kinds).not.toContain("laugh");
    expect(kinds).not.toContain("lonely");
  });

  it("잠수가 짧고, 텔레파시가 없고, 불린 횟수가 적으면 그 장은 만들지 않는다", () => {
    const r = fakeReport(3);
    const rec = r.stats.records!;
    rec.ghosts = rec.ghosts.map((g) => ({ ...g, days: 2 }));
    rec.jinx = null;
    rec.summons = rec.summons.map((s) => ({ ...s, calls: 4 }));
    const kinds = buildSlides(r).map((x) => x.kind);
    for (const k of ["ghost", "jinx", "summon"] as const) expect(kinds).not.toContain(k);
  });

  it("답장 기록이 있으면 '누가 누구 말을 받나', 자기 자신은 빼고 가장 많이 받은 사람", () => {
    const r = fakeReport(3);
    r.stats.replies = { m1: { m1: 9, m2: 3, m3: 7 }, m2: { m1: 0, m2: 0, m3: 0 }, m3: { m1: 2, m2: 0, m3: 0 } };
    expect(topResponders(r.stats)).toEqual([
      { from: "m1", to: "m3", count: 7 },
      { from: "m3", to: "m1", count: 2 },
    ]);
    expect(buildSlides(r).some((x) => x.kind === "relations")).toBe(true);
  });

  it("앞뒤 대화가 있는 명장면이 있으면 리플레이 장", () => {
    const r = fakeReport(2);
    expect(replayScene(r)).toBeNull();
    const q = r.report.members[1].scenes[0].quotes[0];
    r.contexts = {
      [quoteKey(q)]: {
        focus: 1,
        lines: [
          { date: "7/9", time: "21:00", who: "도토리", text: "누가 내 김밥 먹었어" },
          { date: "7/9", time: "21:01", who: q.who, text: q.text },
        ],
      },
    };
    expect(replayScene(r)?.member).toBe("고등어");
    expect(buildSlides(r).some((x) => x.kind === "replay")).toBe(true);
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

  it("관련 단어는 최대 3개, 중복·민감 단어 없이", () => {
    const r = fakeReport(3);
    r.stats.members[0].catchphrases = [
      { text: "배고파", count: 9 },
      { text: "배고파", count: 8 },
      { text: "병원 가야돼", count: 7 },
      { text: "가자", count: 6 },
    ];
    for (const s of buildSlides(r)) {
      const w = relatedWords(s, r);
      expect(w.length).toBeLessThanOrEqual(3);
      expect(new Set(w).size).toBe(w.length);
      expect(w).not.toContain("병원 가야돼");
    }
    const opening = buildSlides(r).find((s) => s.kind === "opening")!;
    expect(relatedWords(opening, r)).toContain("배고파");
    for (const kind of ["ranking", "mbti", "awards", "bag", "closing"]) {
      expect(relatedWords(buildSlides(r).find((s) => s.kind === kind)!, r)).toEqual([]);
    }
  });

  it("배경이 밝으면 어두운 글자", () => {
    expect(inkOn("#ffc53d")).toBe("#17142e");
    expect(inkOn("#17142e")).toBe("#f3efff");
  });
});

describe("샘플 맛보기 스토리", () => {
  it("앞쪽 통계 장 몇 개만 남기고 AI 분석 장 없이 '우리 방은?' 장으로 끝난다", async () => {
    const { buildSlides, teaserSlides } = await import("./slides");
    const { fakeReport } = await import("../testing/fakeReport");
    const all = buildSlides(fakeReport(4));
    const t = teaserSlides(all);
    expect(t.at(-1)?.kind).toBe("teaser");
    expect(t.length).toBeLessThanOrEqual(5);
    expect(t.some((s) => ["member", "pair", "mbti", "awards", "bag", "acts", "closing"].includes(s.kind))).toBe(false);
  });
});
