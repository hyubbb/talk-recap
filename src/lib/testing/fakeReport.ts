import type { SavedReport } from "../report/storage";
import type { MemberStats } from "../kakao/stats";

// 테스트 전용 가짜 리포트. 이름과 문장은 전부 지어낸 것이다.
const NAMES = ["도토리", "고등어", "감자", "고구마", "홍길동"];
const COLORS = ["#FF6B5E", "#FFC53D", "#4ADE80", "#38BDF8", "#A78BFA"];
const axis = (letter: string) => ({ letter, reason: "근거" });

function memberStats(id: string, i: number): MemberStats {
  return {
    id, messages: 1000 - i * 100, share: 0.3 - i * 0.05, avgLength: 10, laughPerMessage: 0.2, questions: 5,
    emoticons: 3, photos: 2, links: 1, hours: Array(24).fill(i), weekdays: Array(7).fill(1), activeDays: 50,
    firstOfDay: 10 + i, lastWord: 80 - i * 10, nightRatio: 0.1 + i * 0.05,
    catchphrases: [{ text: ["흠", "넵", "ㅋㅋㅋ", "아 진짜?", "고생추"][i], count: 500 - i * 50 }],
  };
}

export function fakeReport(count = 5, quotesEach = 6): SavedReport {
  const names = NAMES.slice(0, count);
  return {
    id: "fake-report",
    createdAt: 0,
    provider: "mock",
    members: names.map((name, i) => ({ id: `m${i + 1}`, name, color: COLORS[i] })),
    stats: {
      totalMessages: 5000, start: Date.UTC(2026, 6, 19), end: Date.UTC(2026, 9, 26), days: 100,
      byMonth: [{ month: "2026-07", count: 5000 }], busiestDay: { date: "2026-10-14", count: 300 },
      hours: Array(24).fill(10), members: names.map((_, i) => memberStats(`m${i + 1}`, i)),
      replies: {}, mentions: {},
      hidden: {
        longestMessage: { memberId: "m1", ts: Date.UTC(2026, 7, 1), length: 300, preview: "아주 긴 메시지" },
        lateNightMonologue: { memberId: "m2", ts: Date.UTC(2026, 7, 2, 3), count: 12, minutes: 20 },
        repeatStreak: { memberId: "m3", ts: Date.UTC(2026, 7, 3), text: "네", count: 5 },
        topLastWord: { memberId: "m1", count: 80 },
      },
    },
    report: {
      title: "도토리 마을 회관",
      oneLiner: "퇴근을 기다리는 사람들",
      acts: [{ title: "시작", period: "7월", summary: "만남" }],
      members: names.map((name, i) => ({
        name,
        archetype: `아키타입 ${i}`,
        oneLiner: "한줄평", summary: "요약", humor: "드립",
        scenes: [{ title: "명장면", text: "있었던 일", quotes: [{ date: "7/9", who: name, text: `${name}의 명장면 대사` }] }],
        sections: [{ title: ["생활력", "먹부림", "덕질", "드립", "약속"][i] ?? "꼭지", text: "일화", quotes: [{ date: "7/10", who: name, text: `${name}의 꼭지 근거` }] }],
        quotes: Array.from({ length: quotesEach }, (_, k) => ({ date: `7/${k + 1}`, who: name, text: `${name}의 명언 ${k}번째` })),
        mbti: { type: "ENFP", confidence: 0.6, claimed: i === 0 ? "INTJ" : null, ei: axis("E"), sn: axis("N"), tf: axis("F"), jp: axis("P") },
        bag: { bag: "에코백", items: [{ item: "컵라면", reason: "야식" }, { item: "보조배터리", reason: "방전" }] },
      })),
      pairs: [
        { a: names[0], b: names[1], score: 90, label: "티키타카", reason: "말이 잘 통함" },
      ],
      awards: [{ title: "수다왕", winner: names[0], reason: "1000개", quotes: [{ date: "7/1", who: names[0], text: `${names[0]}의 명언 0번째` }] }],
      closing: "다음 100일도 잘 부탁해요",
    },
    usage: { input: 0, output: 0 },
    droppedQuotes: 0,
  };
}
