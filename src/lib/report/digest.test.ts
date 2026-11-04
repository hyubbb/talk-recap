import { describe, expect, it } from "vitest";
import { dictionaryWords, statsDigest } from "./digest";
import { fakeReport } from "../testing/fakeReport";

describe("dictionaryWords", () => {
  it("퍼진 유행어 먼저, 그다음 말버릇. 흔한 대답·ㅋㅋ·민감한 말·중복은 뺀다", () => {
    const { stats } = fakeReport(3);
    stats.members[0].catchphrases = [{ text: "가보자고", count: 9 }, { text: "병원 가야돼", count: 8 }, { text: "퇴근각", count: 3 }];
    stats.members[1].catchphrases = [{ text: "넵", count: 9 }, { text: "ㅋㅋㅋ", count: 8 }];
    stats.members[2].catchphrases = [{ text: "아 진짜?", count: 9 }];
    expect(dictionaryWords(stats)).toEqual(["가보자고", "아 진짜?", "퇴근각"]);
  });

  it("예전 결과(fun 없음)도 말버릇으로 후보를 만든다", () => {
    const { stats } = fakeReport(2);
    delete stats.fun;
    expect(dictionaryWords(stats)).toEqual([]);
    stats.members[0].catchphrases = [{ text: "흠;;", count: 3 }];
    expect(dictionaryWords(stats)).toEqual(["흠;;"]);
  });
});

describe("statsDigest", () => {
  it("새 기록 요약도 AI 입력에 들어간다", () => {
    const { stats } = fakeReport(3);
    const d = statsDigest(stats, (id) => ({ m1: "도토리", m2: "고등어", m3: "감자" })[id] ?? id);
    expect(d).toContain("잠수 기록 감자: 11일");
    expect(d).toContain("텔레파시 도토리 ↔ 고등어");
  });
});
