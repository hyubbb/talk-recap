import { describe, expect, it } from "vitest";
import { buildQuiz, QUIZ_SIZE, scoreOf } from "./build";
import { isSensitive } from "./sensitive";
import { fakeReport } from "../testing/fakeReport";

describe("buildQuiz", () => {
  it("10문제, 중복 없음, 보기에 정답 포함, 보기 4개", () => {
    const q = buildQuiz(fakeReport());
    expect(q).toHaveLength(QUIZ_SIZE);
    const prompts = q.map((x) => x.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
    for (const x of q) {
      expect(x.options).toContain(x.answer);
      expect(x.options).toHaveLength(4);
      expect(new Set(x.options).size).toBe(4);
    }
  });

  it("같은 사람 문제는 3개 이하, 통계 문제 2~3개", () => {
    const q = buildQuiz(fakeReport());
    const per = new Map<string, number>();
    for (const x of q) per.set(x.answer, (per.get(x.answer) ?? 0) + 1);
    for (const n of per.values()) expect(n).toBeLessThanOrEqual(3);
    const stats = q.filter((x) => x.kind === "stat").length;
    expect(stats).toBeGreaterThanOrEqual(2);
    expect(stats).toBeLessThanOrEqual(3);
  });

  it("인원 적은 방: 2명이면 보기 2개, 문제는 1인당 3개 제한으로 줄어든다", () => {
    const q = buildQuiz(fakeReport(2));
    expect(q.length).toBeGreaterThan(0);
    expect(q.length).toBeLessThanOrEqual(6);
    for (const x of q) {
      expect(x.options).toHaveLength(2);
      expect(x.options).toContain(x.answer);
    }
  });

  it("1명이면 퀴즈 없음", () => {
    expect(buildQuiz(fakeReport(1))).toEqual([]);
  });

  it("민감 단어·4자 미만 인용은 빠진다", () => {
    const r = fakeReport(3, 0);
    r.report.members[1].quotes = [
      { date: "7/1", who: "고등어", text: "ㅋㅋ" },
      { date: "7/2", who: "고등어", text: "나 내일 병원 가야 돼" },
      { date: "7/3", who: "고등어", text: "오늘 점심 뭐 먹지" },
    ];
    const q = buildQuiz(r).filter((x) => x.kind === "quote");
    expect(q.map((x) => x.prompt)).toEqual(["오늘 점심 뭐 먹지"]);
  });

  it("같은 시드면 같은 문제", () => {
    expect(buildQuiz(fakeReport(), "a")).toEqual(buildQuiz(fakeReport(), "a"));
  });

  it("점수", () => {
    expect(scoreOf(7, 10)).toBe(70);
    expect(scoreOf(0, 0)).toBe(0);
  });

  it("민감 필터", () => {
    expect(isSensitive("월급 들어왔다")).toBe(true);
    expect(isSensitive("퇴근하고 싶다")).toBe(false);
  });
});
