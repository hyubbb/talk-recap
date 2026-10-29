import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../kakao/types";
import { extractContexts, phraseSamples, quoteKey } from "./context";

// 지어낸 대화
const t = (d: number, h: number, mi: number) => Date.UTC(2026, 6, d, h, mi);
const msg = (ts: number, author: string, text: string, kind: ChatMessage["kind"] = "text"): ChatMessage => ({ ts, author, text, kind });
const MESSAGES: ChatMessage[] = [
  msg(t(19, 9, 0), "도토리", "좋은 아침"),
  msg(t(19, 9, 1), "고등어", "출근함?"),
  msg(t(19, 9, 2), "도토리", "흠"),
  msg(t(19, 9, 3), "고등어", "또 흠이야 ㅋㅋㅋ"),
  msg(t(19, 9, 4), "감자", "내 번호 010-1234-5678"),
  msg(t(19, 9, 5), "도토리", "흠;;"),
  msg(t(19, 9, 6), "봇", "알림"),
  msg(t(19, 9, 7), "감자", "", "photo"),
  msg(t(20, 10, 0), "도토리", "흠 그렇군"),
  msg(t(20, 10, 1), "고등어", "병원 다녀옴"),
];
const nameOf = (a: string) => (a === "봇" ? null : a === "도토리" ? "도토리왕" : a);

describe("근거 문맥", () => {
  it("인용 앞뒤 2줄을 붙이고, 빠진 멤버(봇)는 건너뛰고, 민감정보는 가린다", () => {
    const q = { date: "7/19", who: "고등어", text: "또 흠이야 ㅋㅋㅋ" };
    const ctx = extractContexts(MESSAGES, nameOf, [q]);
    const b = ctx[quoteKey(q)];
    expect(b.focus).toBe(2);
    expect(b.lines.map((l) => l.text)).toEqual(["출근함?", "흠", "또 흠이야 ㅋㅋㅋ", "내 번호 [전화번호]", "흠;;"]);
    expect(b.lines[1].who).toBe("도토리왕");
    expect(b.lines[0].time).toBe("09:01");
  });

  it("원문에 없는 인용은 문맥이 없다", () => {
    expect(extractContexts(MESSAGES, nameOf, [{ date: "7/19", who: "감자", text: "지어낸 말" }])).toEqual({});
  });

  it("끝부분 인용은 있는 만큼만, 사진은 표시로, 민감 주제 줄은 가린다", () => {
    const q = { date: "7/20", who: "도토리왕", text: "흠 그렇군" };
    const b = extractContexts(MESSAGES, nameOf, [q])[quoteKey(q)];
    expect(b.lines.map((l) => l.text)).toEqual(["흠;;", "(사진)", "흠 그렇군", "(민감한 내용이라 가렸어요)"]);
    expect(b.focus).toBe(2);
  });

  it("말버릇마다 실제로 쓴 장면을 하나 고른다", () => {
    const out = phraseSamples(MESSAGES, nameOf, [{ id: "m1", name: "도토리왕", phrases: [{ text: "흠", count: 2 }, { text: "없는말", count: 1 }] }]);
    expect(out.m1[0].context?.lines[out.m1[0].context.focus].text).toBe("흠");
    expect(out.m1[1].context).toBeNull();
  });
});
