import { describe, expect, it } from "vitest";
import { hashToken, isValidSlug, newDeleteToken, newSlug, randomBase62, SLUG_LENGTH, verifyToken } from "./token";
import { savedReportSchema } from "./schema";

describe("공유 슬러그", () => {
  it("12자 이상 base62이고 매번 다르다", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const s = newSlug();
      expect(s).toHaveLength(SLUG_LENGTH);
      expect(s.length).toBeGreaterThanOrEqual(12);
      expect(s).toMatch(/^[0-9A-Za-z]+$/);
      seen.add(s);
    }
    expect(seen.size).toBe(2000);
  });

  it("문자가 고르게 나온다", () => {
    const freq = new Map<string, number>();
    const s = randomBase62(62_000);
    for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
    expect(freq.size).toBe(62);
    for (const n of freq.values()) expect(n).toBeGreaterThan(700);
  });

  it("형식 검사", () => {
    expect(isValidSlug(newSlug())).toBe(true);
    expect(isValidSlug("short")).toBe(false);
    expect(isValidSlug("abcdefghijk-l")).toBe(false);
    expect(isValidSlug("../../etc/passwd")).toBe(false);
    expect(isValidSlug("a".repeat(33))).toBe(false);
  });
});

describe("삭제 토큰", () => {
  it("해시는 sha256 hex이고 원문을 담지 않는다", () => {
    const t = newDeleteToken();
    const h = hashToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(t);
    expect(hashToken(t)).toBe(h);
  });

  it("맞는 토큰만 통과한다", () => {
    const t = newDeleteToken();
    const h = hashToken(t);
    expect(verifyToken(t, h)).toBe(true);
    expect(verifyToken(newDeleteToken(), h)).toBe(false);
    expect(verifyToken("", h)).toBe(false);
    expect(verifyToken(null, h)).toBe(false);
    expect(verifyToken(t, "not-a-hash")).toBe(false);
    expect(verifyToken("x".repeat(500), h)).toBe(false);
  });
});

describe("공유 본문 검증", () => {
  const axis = { letter: "E", reason: "말이 많다" };
  const sample = {
    id: "abc123",
    createdAt: 1,
    provider: "mock",
    members: [{ id: "m1", name: "도토리", color: "#FF6B5E" }],
    stats: {
      totalMessages: 10,
      start: 0,
      end: 1,
      days: 1,
      byMonth: [{ month: "2026-07", count: 10 }],
      busiestDay: null,
      hours: Array(24).fill(0),
      members: [],
      replies: {},
      mentions: { m1: { m2: 3 } },
      hidden: { longestMessage: null, lateNightMonologue: null, repeatStreak: null, topLastWord: null },
    },
    report: {
      title: "도토리방",
      oneLiner: "한 줄",
      acts: [],
      members: [
        {
          name: "도토리",
          archetype: "a",
          oneLiner: "o",
          summary: "s",
          humor: "h",
          scenes: [],
          sections: [],
          quotes: [],
          mbti: { type: "ENFP", confidence: 0.5, claimed: null, ei: axis, sn: axis, tf: axis, jp: axis },
          bag: { bag: "에코백", items: [] },
        },
      ],
      pairs: [],
      awards: [],
      closing: "끝",
    },
    usage: { input: 0, output: 0 },
    droppedQuotes: 0,
  };

  it("정상 본문은 통과", () => {
    expect(savedReportSchema.safeParse(sample).success).toBe(true);
  });

  it("예전 모양 결과(꼭지 없음, 변화·스트레스·챙김 있음)와 근거 문맥도 받는다", () => {
    const m = sample.report.members[0];
    const legacy = {
      ...sample,
      report: {
        ...sample.report,
        members: [{ name: m.name, archetype: "a", summary: "s", humor: "h", change: "c", stress: "s", care: "c", quotes: [], mbti: m.mbti, bag: m.bag }],
        awards: [{ title: "수다왕", winner: "도토리", reason: "많이 말함" }],
      },
    };
    expect(savedReportSchema.safeParse(legacy).success).toBe(true);
    const withCtx = {
      ...sample,
      contexts: { "도토리|7/19|흠 그렇군": { lines: [{ date: "7/19", time: "09:00", who: "도토리", text: "흠 그렇군" }], focus: 0 } },
      phrases: { m1: [{ text: "흠", count: 3, context: null }] },
    };
    expect(savedReportSchema.safeParse(withCtx).success).toBe(true);
  });

  it("리포트가 빠지거나 숫자가 아니면 실패", () => {
    expect(savedReportSchema.safeParse({ ...sample, report: undefined }).success).toBe(false);
    expect(savedReportSchema.safeParse({ ...sample, createdAt: "1" }).success).toBe(false);
    expect(savedReportSchema.safeParse({ ...sample, members: [] }).success).toBe(false);
  });
});
