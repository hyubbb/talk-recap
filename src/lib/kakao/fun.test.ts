import { describe, expect, it } from "vitest";
import { bestMood, computeFun, funFacts, type FunStats } from "./fun";
import type { ChatMessage } from "./types";

// 지어낸 대화. 분 단위로 시각을 적는다.
const T0 = Date.UTC(2026, 6, 19, 20, 0);
const msg = (min: number, author: string, text: string): ChatMessage => ({ ts: T0 + min * 60_000, author, text, kind: "text" });
const run = (msgs: ChatMessage[], phrases = new Map<string, Map<string, number>>()) =>
  computeFun(msgs, (m) => m.author, ["도토리", "고등어", "감자"], phrases);

describe("computeFun", () => {
  it("웃음 유발: 1분 안에 다른 사람이 ㅋㅋ로 받으면 센다 (내 ㅋㅋ는 시도로 안 센다)", () => {
    const f = run([
      msg(0, "도토리", "오늘 회의 또 늘어남"),
      msg(0.5, "고등어", "ㅋㅋㅋㅋ"),
      msg(1, "도토리", "ㅋㅋ"),
      msg(10, "도토리", "점심 뭐 먹지"),
      msg(12, "감자", "ㅋㅋ"),
    ]);
    const d = f.laughs.find((l) => l.memberId === "도토리")!;
    expect(d.attempts).toBe(2);
    expect(d.triggers).toBe(1);
    expect(d.ratio).toBe(0.5);
  });

  it("허공: 차례가 끝나고 30분 넘게 답이 없으면 세고, 가장 오래 빈 질문을 남긴다", () => {
    const f = run([
      msg(0, "고등어", "주말에 등산 갈 사람?"),
      msg(1, "고등어", "아무도 없나?"),
      msg(200, "도토리", "미안 이제 봄"),
      msg(201, "고등어", "ㅇㅋ"),
    ]);
    const g = f.unanswered.find((u) => u.memberId === "고등어")!;
    expect(g.turns).toBe(1);
    expect(g.count).toBe(1);
    expect(f.loneliest).toMatchObject({ memberId: "고등어", text: "아무도 없나?", minutes: 199 });
  });

  it("랠리: 두 사람이 5분 안에 번갈아 주고받은 차례 수, 끼어들면 끊긴다", () => {
    const msgs: ChatMessage[] = [];
    for (let i = 0; i < 8; i++) msgs.push(msg(i, i % 2 ? "고등어" : "도토리", `말 ${i}`));
    msgs.push(msg(8, "감자", "나도"));
    for (let i = 0; i < 3; i++) msgs.push(msg(9 + i, i % 2 ? "감자" : "도토리", `또 ${i}`));
    const f = run(msgs);
    expect(f.rally).toMatchObject({ a: "도토리", b: "고등어", turns: 8, ts: T0 });
  });

  it("랠리는 6번 미만이면 기록하지 않는다", () => {
    const f = run([msg(0, "도토리", "a"), msg(1, "고등어", "b"), msg(2, "도토리", "c")]);
    expect(f.rally).toBeNull();
  });

  it("ㅋ 길이는 월별로 가장 긴 ㅋ 줄기의 평균", () => {
    const f = run([msg(0, "도토리", "ㅋㅋ"), msg(1, "고등어", "ㅋㅋㅋㅋ 아 ㅋㅋ"), msg(2, "감자", "ㅎㅎ")]);
    expect(f.laughLength).toEqual([{ month: "2026-07", avg: 3 }]);
  });

  it("말버릇 원조: 2명 이상이 2번 넘게 쓴 말, 처음 쓴 순서대로. 흔한 대답·민감한 말은 뺀다", () => {
    const phrases = new Map([
      ["가보자고", new Map([["도토리", 5], ["고등어", 3], ["감자", 1]])],
      ["ㅇㅋ", new Map([["도토리", 9], ["고등어", 9]])],
      ["병원 가야돼", new Map([["도토리", 3], ["고등어", 3]])],
    ]);
    const f = run(
      [msg(0, "고등어", "주말?"), msg(5, "도토리", "가보자고"), msg(60, "고등어", "가보자고"), msg(70, "감자", "가보자고")],
      phrases,
    );
    expect(f.origins).toHaveLength(1);
    expect(f.origins[0].text).toBe("가보자고");
    expect(f.origins[0].spread.map((s) => s.memberId)).toEqual(["도토리", "고등어"]);
  });

  it("분위기 메이커: 말한 날과 안 한 날의 방 하루 평균", () => {
    const day = 24 * 60;
    const msgs: ChatMessage[] = [];
    for (let d = 0; d < 10; d++) {
      const loud = d < 5;
      for (let k = 0; k < (loud ? 9 : 2); k++) msgs.push(msg(d * day + k, k % 2 ? "고등어" : "도토리", "얘기"));
      if (loud) msgs.push(msg(d * day + 30, "감자", "왔다"));
    }
    const f = run(msgs);
    const gamja = f.mood.find((m) => m.memberId === "감자")!;
    expect(gamja).toMatchObject({ withDays: 5, withoutDays: 5, withAvg: 10, withoutAvg: 2 });
    expect(bestMood(f)?.memberId).toBe("감자");
  });

  it("분위기 메이커: 거의 매일 말하는 사람(안 한 날이 며칠뿐)은 배수가 튀어서 뺀다", () => {
    const fun = { mood: [{ memberId: "도토리", withAvg: 74, withoutAvg: 2, withDays: 95, withoutDays: 5 }] } as FunStats;
    expect(bestMood(fun)).toBeNull();
  });
});

describe("funFacts", () => {
  const base: FunStats = {
    laughs: [
      { memberId: "도토리", attempts: 100, triggers: 51, ratio: 0.51 },
      { memberId: "고등어", attempts: 5, triggers: 5, ratio: 1 },
    ],
    unanswered: [{ memberId: "감자", turns: 200, count: 2, ratio: 0.01 }],
    loneliest: null,
    rally: { a: "도토리", b: "Janice", turns: 61, ts: 0, minutes: 30 },
    laughLength: [],
    origins: [],
    mood: [],
  };

  it("예전 결과(fun 없음)는 빈 목록", () => {
    expect(funFacts(undefined, (id) => id)).toEqual([]);
  });

  it("표본이 적은 사람은 빼고, 10% 미만 허공 비율은 안 보여준다", () => {
    const facts = funFacts(base, (id) => id);
    expect(facts.map((f) => f.key)).toEqual(["laugh", "rally"]);
    expect(facts[0]).toMatchObject({ value: "51%", who: ["도토리"] });
    expect(facts[1]).toMatchObject({ value: "61턴", who: ["도토리", "Janice"] });
  });

  it("한 줄 요약은 이름 뒤 조사가 필요 없다 (영문 이름)", () => {
    const facts = funFacts({ ...base, laughs: [{ memberId: "Janice", attempts: 100, triggers: 40, ratio: 0.4 }] }, (id) => id);
    expect(facts[0].text).toBe("웃음 버튼 Janice: 말하면 40% 확률로 ㅋㅋ가 터져요");
    expect(facts.some((f) => /이\(가\)/.test(f.text))).toBe(false);
  });
});
