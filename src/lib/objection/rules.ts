import type { Report } from "../llm/schema";

export const MAX_OBJECTION_CHARS = 200;

/**
 * 반박 대상 키: "member:이름", "mbti:이름", "award:번호".
 * 그 항목의 당사자만 반박할 수 있다.
 */
export function ownerOfTarget(report: Report, target: string): string | null {
  const m = target.match(/^(member|mbti|award):(.+)$/);
  if (!m) return null;
  if (m[1] === "award") {
    const i = Number(m[2]);
    return Number.isInteger(i) && report.awards[i] ? report.awards[i].winner : null;
  }
  return report.members.some((x) => x.name === m[2]) ? m[2] : null;
}

export function canObject(report: Report, target: string, memberName: string | null | undefined): boolean {
  return !!memberName && ownerOfTarget(report, target) === memberName;
}

/** 반박 인정에 필요한 표: 반박한 사람을 뺀 멤버의 과반 */
export function voteThreshold(memberCount: number): number {
  const others = Math.max(1, memberCount - 1);
  return Math.floor(others / 2) + 1;
}

export function statusOf(accept: number, reject: number, memberCount: number): "open" | "accepted" | "rejected" {
  const t = voteThreshold(memberCount);
  if (accept >= t) return "accepted";
  if (reject >= t) return "rejected";
  return "open";
}

/** Realtime 채널 report:{id}로 오가는 반박 이벤트 */
export type ObjectionEvent =
  | { type: "vote"; id: number; accept: number; reject: number; status: string }
  | { type: "objection"; item: { id: number; target: string; memberName: string; body: string; status: string } };
