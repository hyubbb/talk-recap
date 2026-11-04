import { describe, expect, it } from "vitest";
import { BYTES_PER_DAY, budgetFor, chunkDatesOk } from "./usage";
import { chunkMessages } from "../kakao/chunk";
import { DAY_MS } from "../legal/business";
import type { ChatMessage } from "../kakao/types";

// 지어낸 대화. 이틀에 한 번씩 메시지
const msgs = (from: number, days: number): ChatMessage[] =>
  Array.from({ length: Math.ceil(days / 2) }, (_, i) => ({
    ts: from + i * 2 * DAY_MS + 9 * 3600_000,
    author: i % 2 ? "도토리" : "고등어",
    text: `${i}번째 얘기\n이어지는 줄 1/1 00:00 가짜`,
    kind: "text",
  }));
const one = (m: ChatMessage[]) => chunkMessages(m, (a) => a)[0];

describe("주문 한도", () => {
  it("상품 기간으로 원문 바이트·기간 한도가 정해진다", () => {
    expect(budgetFor("lite")).toEqual({ maxBytes: 100 * BYTES_PER_DAY, maxSynth: 4, maxSpan: 99 * DAY_MS });
    expect(budgetFor("full")?.maxSpan).toBe(364 * DAY_MS);
    expect(budgetFor("nope")).toBeNull();
  });
});

describe("구간 날짜 확인", () => {
  it("브라우저가 만든 구간은 통과 (해를 넘겨도)", () => {
    const c = one(msgs(Date.UTC(2026, 10, 1), 120));
    expect(new Date(c.end).getUTCFullYear()).toBe(2027);
    expect(chunkDatesOk(c.text, c.start, c.end)).toBe(true);
  });

  it("기간을 짧게 속이면 거절", () => {
    const c = one(msgs(Date.UTC(2026, 0, 1), 300));
    expect(chunkDatesOk(c.text, c.start, c.start + 30 * DAY_MS)).toBe(false);
    expect(chunkDatesOk(c.text, c.start + DAY_MS * 2, c.end)).toBe(false);
  });

  it("여러 해 대화를 한 해 기간이라고 속이면 거절 (날짜가 되돌아감)", () => {
    const a = one(msgs(Date.UTC(2025, 0, 1), 60));
    const b = one(msgs(Date.UTC(2026, 0, 1), 60));
    expect(chunkDatesOk(`${a.text}\n${b.text}`, b.start, b.end)).toBe(false);
  });

  it("날짜 줄이 없거나 끝이 시작보다 이르면 거절", () => {
    expect(chunkDatesOk("아무 말", 0, DAY_MS)).toBe(false);
    const c = one(msgs(Date.UTC(2026, 0, 1), 10));
    expect(chunkDatesOk(c.text, c.end, c.start)).toBe(false);
  });
});
