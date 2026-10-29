import type { SavedReport } from "../report/storage";
import { isSensitive } from "../quiz/sensitive";

export type SlideKind =
  | "opening"
  | "ranking"
  | "catchphrase"
  | "hours"
  | "hidden"
  | "acts"
  | "member"
  | "pair"
  | "mbti"
  | "awards"
  | "bag"
  | "closing";

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

  const slides: Slide[] = [
    { id: "opening", kind: "opening", title: "오프닝", bg: NIGHT },
    { id: "ranking", kind: "ranking", title: "수다왕 랭킹", bg: SPARK },
    { id: "catchphrase", kind: "catchphrase", title: "말버릇 왕", bg: next() },
    { id: "hours", kind: "hours", title: "누가 밤에 살아나나", bg: NIGHT },
    { id: "hidden", kind: "hidden", title: "숨은 기록", bg: next() },
    { id: "acts", kind: "acts", title: "줄거리", bg: SPARK },
  ];
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

/** 스토리에 올릴 궁합 한 쌍. 민감 주제나 놀림 라벨은 리포트에만 둔다. */
export function safePair(saved: SavedReport) {
  return [...saved.report.pairs]
    .sort((a, b) => b.score - a.score)
    .find((p) => !isSensitive(`${p.label} ${p.reason}`));
}

/** 배경색 위에 올릴 글자색 (밝은 배경이면 night) */
export function inkOn(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#f3efff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? NIGHT : "#f3efff";
}
