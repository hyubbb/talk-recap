import { describe, expect, it } from "vitest";
import { parseKakaoText } from "./parse";
import { suggestMembers } from "./members";
import { computeStats } from "./stats";
import { chunkMessages } from "./chunk";
import { maskSensitive } from "./privacy";

// 지어낸 대화
const SAMPLE = [
  "2026. 7. 19. 오후 9:00, 가나다 : 흠",
  "2026. 7. 19. 오후 9:01, 라마바 : 가나다 뭐함?",
  "2026. 7. 19. 오후 9:02, 가나다 : 흠",
  "2026. 7. 19. 오후 9:03, 가나다 : 흠",
  "2026. 7. 19. 오후 9:03, 가나다 : 흠",
  "2026. 7. 20. 오전 3:00, 라마바 : ㅋㅋㅋ",
  "2026. 7. 20. 오전 3:01, 라마바 : 잠이 안 와",
  "2026. 7. 20. 오전 3:02, 라마바 : 진짜로",
  "2026. 7. 20. 오전 3:03, 라마바 : 아무도 없나",
  "2026. 7. 20. 오전 3:05, 라마바 : 자야지",
  "2026. 7. 20. 오후 1:00, 가나다 라마 : 닉네임 바꿈",
  "2026. 7. 20. 오후 1:01, ChatGPT : 안녕하세요",
].join("\n");

describe("members + stats", () => {
  const parsed = parseKakaoText(SAMPLE);
  const groups = suggestMembers(parsed.messages);
  const stats = computeStats(parsed.messages, groups);

  it("닉네임이 바뀐 이름을 같은 사람으로 묶고 봇을 구분", () => {
    const g = groups.find((x) => x.names.includes("가나다"))!;
    expect(g.names.sort()).toEqual(["가나다", "가나다 라마"]);
    expect(groups.find((x) => x.displayName === "ChatGPT")?.isBot).toBe(true);
  });

  it("봇을 제외하고 집계", () => {
    expect(stats.totalMessages).toBe(11);
    expect(stats.days).toBe(2);
  });

  it("말버릇, 질문, 언급, 답장", () => {
    const ga = groups.find((x) => x.names.includes("가나다"))!.id;
    const ra = groups.find((x) => x.names.includes("라마바"))!.id;
    const g = stats.members.find((m) => m.id === ga)!;
    expect(g.catchphrases[0]).toEqual({ text: "흠", count: 4 });
    const r = stats.members.find((m) => m.id === ra)!;
    expect(r.questions).toBe(1);
    expect(stats.mentions[ra][ga]).toBe(1);
    expect(stats.replies[ga][ra]).toBe(1);
  });

  it("숨은 기록: 연속 반복, 새벽 독백", () => {
    expect(stats.hidden.repeatStreak?.count).toBe(3);
    expect(stats.hidden.lateNightMonologue?.count).toBe(5);
  });

  it("구간 분할은 날짜 경계를 우선", () => {
    const nameOf = (a: string) => (a === "ChatGPT" ? null : a);
    const chunks = chunkMessages(parsed.messages, nameOf, { maxLines: 7 });
    expect(chunks.length).toBe(2);
    expect(chunks[0].text.split("\n").every((l) => l.startsWith("7/19"))).toBe(true);
    expect(chunks[1].text.startsWith("7/20 03:00 라마바: ")).toBe(true);
  });
});

describe("maskSensitive", () => {
  it("전화번호, 이메일, 계좌를 가림", () => {
    const r = maskSensitive("010-1234-5678 a@b.com 국민 123456-01-123456");
    expect(r.text).toBe("[전화번호] [이메일] [계좌번호]");
    expect(r.hits).toBe(3);
  });
});
