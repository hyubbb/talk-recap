import type { Report } from "../llm/schema";
import { isSensitive } from "../quiz/sensitive";

type Member = Report["members"][number];

/**
 * 이미지 생성 서비스에 붙여넣을 프롬프트. 서비스 안에서 이미지를 만들지 않는다(PRD 비목표).
 * 실존 인물처럼 보이지 않게 이름·얼굴 특징·사진풍 묘사는 넣지 않고 캐리커처 스타일을 고정한다.
 */
const SAFE_STYLE =
  "Not photorealistic, not a real person, no celebrity likeness, no text, no logos or brand marks.";

const clean = (s: string) =>
  s
    .replace(/\(목업\)|\(추정\)/g, "")
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const traits = (m: Member) =>
  [m.archetype, m.humor, m.care]
    .map(clean)
    .filter((t) => t && !isSensitive(t))
    .join(" / ");

const items = (m: Member, n = 8) =>
  m.bag.items
    .map((i) => clean(i.item))
    .filter((t) => t && !isSensitive(t))
    .slice(0, n);

export function facePrompt(m: Member): string {
  return [
    "Korean webtoon style caricature portrait of a fictional character, bust shot, clean line art, flat cel shading, soft pastel background.",
    `Personality to express through pose and expression: ${traits(m)}.`,
    `Vibe matches MBTI ${m.mbti.type}.`,
    "Exaggerated cute proportions, big expressive eyes, simple shapes.",
    SAFE_STYLE,
  ].join(" ");
}

export function roomPrompt(m: Member): string {
  return [
    "Isometric 3D diorama of a small cozy room, cube cutaway, soft lighting, toy-like miniature style, no people.",
    `The room belongs to a fictional character described as: ${traits(m)}.`,
    `Objects scattered around: ${items(m, 6).join(", ")}.`,
    SAFE_STYLE,
  ].join(" ");
}

export function bagPrompt(m: Member): string {
  return [
    `Pixel art "what's in my bag" flat lay, 32-bit retro game style, top-down view, items neatly arranged on a solid color background.`,
    `Bag: ${clean(m.bag.bag)}.`,
    `Items: ${items(m).join(", ")}.`,
    SAFE_STYLE,
  ].join(" ");
}

export function groupPrompt(report: Report): string {
  const people = report.members
    .map((m, i) => `character ${i + 1}: ${clean(m.archetype)} (${m.mbti.type} vibe)`)
    .filter((t) => !isSensitive(t));
  return [
    `Korean webtoon style caricature group photo of ${report.members.length} fictional friends posing together like a group chat poster, chibi proportions, flat colors, playful.`,
    people.join("; ") + ".",
    `Overall mood: ${clean(report.oneLiner)}.`,
    SAFE_STYLE,
  ].join(" ");
}
