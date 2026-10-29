/** 멤버 고유색: 다크 배경 위에서 4.5:1 이상 나오도록 고른 8색 */
export const MEMBER_COLORS = [
  "#FF6B5E", // coral
  "#FFC53D", // amber
  "#4ADE80", // green
  "#38BDF8", // sky
  "#A78BFA", // violet
  "#F472B6", // pink
  "#2DD4BF", // teal
  "#FB923C", // orange
] as const;

export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

/** 칩에 함께 보여줄 이니셜 (색만으로 구분하지 않기 위해) */
export function initialOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const nick = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return nick.slice(0, 1).toUpperCase();
}
