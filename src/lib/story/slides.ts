import type { SavedReport } from "../report/storage";
import { isSensitive } from "../quiz/sensitive";
import { bestMood, laughRanking, lonelyRanking, type FunStats } from "../kakao/fun";
import type { RoomStats } from "../kakao/stats";
import { ghostRanking, summonRanking } from "../kakao/records";
import type { StoryBlock } from "../llm/schema";
import { quoteKey, type ContextBlock } from "../report/context";

export type SlideKind =
  | "opening"
  | "ranking"
  | "catchphrase"
  | "origin"
  | "hours"
  | "duty"
  | "laugh"
  | "lonely"
  | "ghost"
  | "rally"
  | "jinx"
  | "mood"
  | "relations"
  | "summon"
  | "replay"
  | "hidden"
  | "acts"
  | "member"
  | "pair"
  | "mbti"
  | "awards"
  | "bag"
  | "closing"
  /** 샘플 결과 맛보기 끝: 내 대화로 분석하기 */
  | "teaser";

export interface Slide {
  id: string;
  kind: SlideKind;
  /** 스크린리더가 읽는 장 제목 */
  title: string;
  /** 배경 단색 */
  bg: string;
  /** member·bag 장의 주인공 */
  member?: string;
}

const SPARK = "#ffc53d";
const NIGHT = "#17142e";

/**
 * 스토리 슬라이드 순서 (docs/PRD.md). 기본 12종, 멤버 아키타입은 1인 1장.
 * 숫자는 화면에서 stats로, 해석은 report로 채운다.
 */
export function buildSlides(saved: SavedReport, me?: string | null): Slide[] {
  const { report, members } = saved;
  const colors = members.map((m) => m.color);
  const colorOf = (name: string) => members.find((m) => m.name === name)?.color ?? SPARK;
  let c = 0;
  const next = () => colors[c++ % Math.max(1, colors.length)] ?? SPARK;

  const fun = saved.stats.fun;
  const rec = saved.stats.records;
  const slides: Slide[] = [
    { id: "opening", kind: "opening", title: "오프닝", bg: NIGHT },
    { id: "ranking", kind: "ranking", title: "수다왕 랭킹", bg: SPARK },
    { id: "catchphrase", kind: "catchphrase", title: "말버릇 왕", bg: next() },
  ];
  if (fun && topOrigin(fun)) slides.push({ id: "origin", kind: "origin", title: "유행어 원조", bg: NIGHT });
  slides.push({ id: "hours", kind: "hours", title: "누가 밤에 살아나나", bg: NIGHT });
  if (saved.stats.members.length >= 2) slides.push({ id: "duty", kind: "duty", title: "여는 사람, 끄는 사람", bg: next() });
  if (fun && laughRanking(fun).length) slides.push({ id: "laugh", kind: "laugh", title: "웃음 버튼", bg: SPARK });
  if (fun && (lonelyRanking(fun).length || fun.loneliest)) slides.push({ id: "lonely", kind: "lonely", title: "허공에 외친 말", bg: NIGHT });
  if (rec && ghostRanking(rec).length) slides.push({ id: "ghost", kind: "ghost", title: "잠수 기록", bg: NIGHT });
  if (fun?.rally) slides.push({ id: "rally", kind: "rally", title: "핑퐁 랠리", bg: next() });
  if (rec?.jinx) slides.push({ id: "jinx", kind: "jinx", title: "텔레파시", bg: SPARK });
  if (fun && bestMood(fun)) slides.push({ id: "mood", kind: "mood", title: "분위기 메이커", bg: SPARK });
  if (topResponders(saved.stats).length) slides.push({ id: "relations", kind: "relations", title: "누가 누구 말을 받나", bg: NIGHT });
  if (rec && summonRanking(rec).length) slides.push({ id: "summon", kind: "summon", title: "부르면 출동", bg: next() });
  slides.push({ id: "hidden", kind: "hidden", title: "숨은 기록", bg: next() });
  slides.push({ id: "acts", kind: "acts", title: "줄거리", bg: SPARK });
  if (replayScene(saved)) slides.push({ id: "replay", kind: "replay", title: "명장면 다시 보기", bg: NIGHT });
  for (const m of report.members) {
    slides.push({ id: `member:${m.name}`, kind: "member", title: `${m.name}의 아키타입`, bg: colorOf(m.name), member: m.name });
  }
  if (safePair(saved)) slides.push({ id: "pair", kind: "pair", title: "최고 궁합", bg: next() });
  slides.push({ id: "mbti", kind: "mbti", title: "MBTI: 본인 주장 vs 행동 추론", bg: NIGHT });
  slides.push({ id: "awards", kind: "awards", title: "어워드", bg: SPARK });
  const bagOwner = report.members.find((m) => m.name === me) ?? report.members[0];
  if (bagOwner) slides.push({ id: "bag", kind: "bag", title: `${bagOwner.name}의 가방`, bg: colorOf(bagOwner.name), member: bagOwner.name });
  slides.push({ id: "closing", kind: "closing", title: "총평", bg: NIGHT });
  return slides;
}

/** 원조가 가려지는 말버릇 (2명 이상 퍼진 것) */
export function topOrigin(fun: FunStats) {
  return fun.origins.find((o) => o.spread.length >= 2) ?? null;
}

/** 사람마다 그 사람 말을 제일 먼저(10분 안에) 받아주는 사람 */
export function topResponders(stats: RoomStats) {
  const out: { from: string; to: string; count: number }[] = [];
  for (const m of stats.members) {
    const row = stats.replies[m.id];
    if (!row) continue;
    let best: { to: string; count: number } | null = null;
    for (const [to, count] of Object.entries(row)) if (to !== m.id && count > 0 && (!best || count > best.count)) best = { to, count };
    if (best) out.push({ from: m.id, ...best });
  }
  return out;
}

/** 앞뒤 대화가 남아 있는 첫 명장면 (말풍선으로 다시 재생) */
export function replayScene(saved: SavedReport): { member: string; block: StoryBlock; context: ContextBlock } | null {
  for (const m of saved.report.members) {
    for (const b of m.scenes) {
      if (isSensitive(`${b.title} ${b.text}`)) continue;
      for (const q of b.quotes) {
        const context = saved.contexts?.[quoteKey(q)];
        if (context && context.lines.length >= 2) return { member: m.name, block: b, context };
      }
    }
  }
  return null;
}

/** 스토리에 올릴 궁합 한 쌍. 민감 주제나 놀림 라벨은 리포트에만 둔다. */
export function safePair(saved: SavedReport) {
  return [...saved.report.pairs]
    .sort((a, b) => b.score - a.score)
    .find((p) => !isSensitive(`${p.label} ${p.reason}`));
}

/**
 * 제목 아래 오른쪽에 메시지처럼 띄울 실제 말버릇 최대 3개.
 * 오프닝·말버릇·멤버 장에만 둔다. 다른 장은 화면에 이미 있는 이름·MBTI·아이템을 되풀이할 뿐이라 빼고, 민감 주제는 뺀다.
 */
export function relatedWords(slide: Slide, saved: SavedReport): string[] {
  const { stats, members } = saved;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "";
  const phrases = (list: { text: string; count: number }[]) => list.map((c) => c.text.trim());
  const allPhrases = () => {
    const all: { text: string; count: number }[] = [];
    for (const m of stats.members) for (const c of m.catchphrases.slice(0, 3)) all.push(c);
    return phrases(all.sort((a, b) => b.count - a.count));
  };

  let words: string[] = [];
  if (slide.kind === "opening") words = allPhrases();
  else if (slide.kind === "catchphrase") words = allPhrases().slice(1);
  else if (slide.kind === "member") {
    const st = stats.members.find((x) => nameOf(x.id) === slide.member);
    words = st ? phrases(st.catchphrases) : [];
  }
  const out: string[] = [];
  for (const w of words) {
    const t = w.trim();
    if (t && t.length <= 14 && /[\p{L}\p{N}]/u.test(t) && !isSensitive(t) && !out.includes(t)) out.push(t);
    if (out.length === 3) break;
  }
  return out;
}

/** 배경색 위에 올릴 글자색 (밝은 배경이면 night) */
export function inkOn(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#f3efff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? NIGHT : "#f3efff";
}

/**
 * 샘플 결과용 맛보기: 앞쪽 통계 장 몇 개만 보여주고 "우리 방은?" 장으로 끝낸다.
 * AI 분석 장(멤버·궁합·MBTI·어워드·가방·줄거리 등)은 보여주지 않는다.
 */
export const TEASER_SLIDES = 4;
const AI_KINDS = new Set<SlideKind>(["acts", "replay", "member", "pair", "mbti", "awards", "bag", "closing"]);
export function teaserSlides(slides: Slide[]): Slide[] {
  const free = slides.filter((s) => !AI_KINDS.has(s.kind)).slice(0, TEASER_SLIDES);
  return [...free, { id: "teaser", kind: "teaser", title: "우리 방은 어떨까", bg: SPARK }];
}
