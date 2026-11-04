import { describe, expect, it } from "vitest";
import { computeRecords, ghostRanking, longestStreak, oneWayReply, recordFacts, summonRanking, waitLabel, workRanking, type RecordStats } from "./records";
import type { ChatMessage } from "./types";

// 지어낸 대화. 분 단위로 시각을 적는다. 2026-07-20은 월요일.
const T0 = Date.UTC(2026, 6, 20, 20, 0);
const DAY = 24 * 60;
const msg = (min: number, author: string, text: string, kind: ChatMessage["kind"] = "text"): ChatMessage => ({ ts: T0 + min * 60_000, author, text, kind });
const IDS = ["도토리", "고등어", "감자"];
/** 이름이 그대로 들어 있으면 부른 걸로 본다 */
const called = (t: string, author: string) => IDS.filter((id) => id !== author && t.includes(id));
const run = (msgs: ChatMessage[]) => computeRecords(msgs, (m) => m.author, IDS, called);
const chatter = (from: number, count: number, author = "고등어") => Array.from({ length: count }, (_, k) => msg(from + k, author, `수다 ${k}`));

describe("computeRecords", () => {
  it("잠수: 그동안 남들이 20개 넘게 떠든 가장 긴 공백과 돌아와서 친 첫마디", () => {
    const r = run([msg(0, "감자", "나 간다"), ...chatter(10, 25), msg(5 * DAY, "감자", "다들 살아있냐")]);
    const g = r.ghosts.find((x) => x.memberId === "감자")!;
    expect(g).toMatchObject({ days: 5, missed: 25, text: "다들 살아있냐" });
    expect(ghostRanking(r)[0].memberId).toBe("감자");
  });

  it("잠수: 방 전체가 조용했던 공백은 잠수가 아니고, 민감한 첫마디는 남기지 않는다", () => {
    const quiet = run([msg(0, "감자", "잘 자"), msg(1, "고등어", "ㅂㅂ"), msg(10 * DAY, "감자", "안녕")]);
    expect(quiet.ghosts).toEqual([]);
    const r = run([msg(0, "감자", "나 간다"), ...chatter(10, 25), msg(4 * DAY, "감자", "병원 다녀왔어")]);
    expect(r.ghosts[0].text).toBe("");
  });

  it("부르면 출동: 처음 불린 때부터 말할 때까지, 6시간 넘으면 안 센다", () => {
    const r = run([
      msg(0, "도토리", "고등어 어디야"),
      msg(1, "감자", "고등어 자?"),
      msg(4, "고등어", "왜"),
      msg(10, "도토리", "고등어 이거 봐"),
      msg(10 + 7 * 60, "고등어", "이제 봄"),
    ]);
    const s = r.summons.find((x) => x.memberId === "고등어")!;
    expect(s).toEqual({ memberId: "고등어", calls: 1, median: 4 });
    expect(summonRanking(r)).toEqual([]); // 5번 미만은 순위에서 뺀다
  });

  it("텔레파시: 1분 안에 이어서 똑같은 말, 흔한 대답·ㅋㅋ는 안 센다", () => {
    const r = run([
      msg(0, "도토리", "치킨각"),
      msg(0, "고등어", "치킨각"),
      msg(5, "고등어", "ㅇㅋ"),
      msg(5, "도토리", "ㅇㅋ"),
      msg(9, "도토리", "ㅋㅋㅋ"),
      msg(9, "고등어", "ㅋㅋㅋ"),
      msg(20, "고등어", "가보자고"),
      msg(20.5, "도토리", "가보자고"),
      msg(40, "감자", "가보자고"),
    ]);
    expect(r.jinx).toEqual({ a: "고등어", b: "도토리", count: 2, text: "가보자고" });
  });

  it("근무 중 딴짓(평일 9~18시)·지운 메시지·연속 대화", () => {
    const r = run([
      msg(-8 * 60, "도토리", "출근"), // 월 12시
      msg(0, "도토리", "퇴근"), // 월 20시
      msg(DAY, "도토리", "", "deleted"),
      msg(3 * DAY, "도토리", "또"),
      msg(4 * DAY - 9 * 60, "도토리", "금 11시"), // 금 11시
      msg(4 * DAY, "도토리", "또또"),
      msg(5 * DAY, "도토리", "주말"), // 토
    ]);
    expect(r.workHours.find((w) => w.memberId === "도토리")).toEqual({ memberId: "도토리", messages: 7, work: 2 });
    expect(r.deleted.find((d) => d.memberId === "도토리")!.count).toBe(1);
    expect(r.streak).toEqual({ days: 3, from: "2026-07-23", to: "2026-07-25" });
  });

  it("잔디 달력은 마지막 날 기준 53주만 남긴다", () => {
    const r = run([msg(0, "도토리", "옛날"), msg(400 * DAY, "도토리", "지금")]);
    expect(r.daily.map((d) => d.date)).toEqual(["2027-08-24"]);
    expect(r.streak?.days).toBe(1);
  });
});

describe("기록 고르기", () => {
  it("연속 일수는 하루라도 비면 끊긴다", () => {
    expect(longestStreak([{ date: "2026-07-01" }, { date: "2026-07-02" }, { date: "2026-07-04" }])).toEqual({ days: 2, from: "2026-07-01", to: "2026-07-02" });
    expect(longestStreak([])).toBeNull();
  });

  it("일방통행 답장: 20번 이상이고 반대보다 3배 이상인 쌍 중 차이가 가장 큰 쌍", () => {
    expect(oneWayReply({ a: { a: 99, b: 40 }, b: { a: 5 } })).toEqual({ from: "a", to: "b", count: 40, back: 5 });
    expect(oneWayReply({ a: { b: 40 }, b: { a: 20 } })).toBeNull();
    expect(oneWayReply({ a: { b: 10 }, b: { a: 0 } })).toBeNull();
  });

  it("근무 중 딴짓은 표본이 적거나 30% 미만이면 뺀다", () => {
    const r = { workHours: [{ memberId: "a", messages: 10, work: 9 }, { memberId: "b", messages: 100, work: 20 }, { memberId: "c", messages: 100, work: 60 }] } as RecordStats;
    expect(workRanking(r).map((w) => w.memberId)).toEqual(["c"]);
  });

  it("기다린 시간 표시", () => {
    expect(waitLabel(0)).toBe("1분 안");
    expect(waitLabel(12)).toBe("12분");
    expect(waitLabel(90)).toBe("1시간 30분");
    expect(waitLabel(120)).toBe("2시간");
  });

  it("예전 결과(records 없음)도 답장 기록만으로 일방통행은 나오고, 요약엔 이름 뒤 조사가 없다", () => {
    const facts = recordFacts(undefined, { m1: { m2: 40 }, m2: { m1: 2 } }, (id) => ({ m1: "Janice", m2: "도토리" })[id] ?? id);
    expect(facts.map((f) => f.key)).toEqual(["oneway"]);
    expect(facts[0]).toMatchObject({ value: "40 : 2", who: ["m1", "m2"], arrow: true });
    expect(facts[0].text).not.toMatch(/(Janice|도토리)(은|는|이|가|을|를)/);
  });
});
