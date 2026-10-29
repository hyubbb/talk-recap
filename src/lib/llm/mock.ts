import type { ChunkNotes, Quote, Report } from "./schema";

/**
 * API 키 없이 화면 흐름을 확인하기 위한 가짜 분석.
 * 인용은 실제 구간 원문에서 뽑으므로 인용 검증도 그대로 통과한다.
 */
const LINE = /^(\d{1,2}\/\d{1,2}) \d{2}:\d{2} (.+?): (.+)$/;

export function mockChunkNotes(chunkText: string, members: string[]): ChunkNotes {
  const byMember = new Map<string, Quote[]>();
  const first = chunkText.match(/^\d{1,2}\/\d{1,2}/)?.[0] ?? "";
  for (const line of chunkText.split("\n")) {
    const m = line.match(LINE);
    if (!m || m[3].startsWith("(") || m[3].length < 4 || m[3].length > 40) continue;
    const list = byMember.get(m[2]) ?? [];
    if (list.length < 30) list.push({ date: m[1], who: m[2], text: m[3] });
    byMember.set(m[2], list);
  }
  const pick = <T>(a: T[], n: number) => a.filter((_, i) => i % Math.max(1, Math.floor(a.length / n)) === 0).slice(0, n);
  const present = members.filter((n) => byMember.has(n));
  return {
    summary: `(목업) ${first}부터 시작하는 구간. 실제 분석은 OPENAI_API_KEY를 넣으면 나와요.`,
    events: [{ date: first, text: "(목업) 이 구간의 첫 사건" }],
    members: present.map((name) => ({
      name,
      episodes: ["(목업) 대표 에피소드"],
      humor: "(목업) 유머 스타일",
      stress: "(목업) 스트레스 반응",
      care: "(목업) 챙기는 방식",
      innerVoice: "(목업) 속마음",
      claimedMbti: null,
      mbtiClues: { ei: "(목업)", sn: "(목업)", tf: "(목업)", jp: "(목업)" },
      quotes: pick(byMember.get(name) ?? [], 3),
    })),
    relations: present.length > 1 ? [{ from: present[0], to: present[1], kind: "tease", note: "(목업) 서로 놀림" }] : [],
    legends: [{ date: first, title: "(목업) 레전드 장면", text: "(목업)" }],
    bagHints: present.map((name) => ({ name, item: "휴대폰", reason: "(목업) 단톡방 상주" })),
  };
}

const TYPES = ["ENFP", "INFJ", "INFP", "ISFJ", "ISTP", "ESTJ", "ENTP", "ISFP"];

export function mockReport(notes: ChunkNotes[], members: string[]): Report {
  const quotes = (name: string) => notes.flatMap((n) => n.members.find((m) => m.name === name)?.quotes ?? []).slice(0, 3);
  return {
    title: "(목업) 우리 방 리포트",
    oneLiner: "(목업) API 키를 넣으면 진짜 분석으로 바뀌어요.",
    acts: notes.slice(0, 4).map((n, i) => ({ title: `${i + 1}막`, period: n.events[0]?.date ?? "", summary: n.summary })),
    members: members.map((name, i) => ({
      name,
      archetype: "(목업) 아키타입",
      summary: "(목업) 한 줄 요약",
      change: "(목업) 기간 동안의 변화",
      humor: "(목업)",
      stress: "(목업)",
      care: "(목업)",
      quotes: quotes(name),
      mbti: {
        type: TYPES[i % TYPES.length],
        confidence: 0.5,
        claimed: null,
        ei: { letter: TYPES[i % TYPES.length][0], reason: "(목업)" },
        sn: { letter: TYPES[i % TYPES.length][1], reason: "(목업)" },
        tf: { letter: TYPES[i % TYPES.length][2], reason: "(목업)" },
        jp: { letter: TYPES[i % TYPES.length][3], reason: "(목업)" },
      },
      bag: { bag: "(목업) 백팩", items: [{ item: "휴대폰", reason: "(목업)" }, { item: "이어폰", reason: "(목업)" }] },
    })),
    pairs:
      members.length > 1
        ? [{ a: members[0], b: members[1], score: 77, label: "(목업) 티키타카", reason: "(목업)" }]
        : [],
    awards: [{ title: "(목업) 수다왕", winner: members[0] ?? "", reason: "(목업)" }],
    closing: "(목업) 총평",
  };
}
