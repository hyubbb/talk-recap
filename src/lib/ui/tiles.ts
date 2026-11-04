/**
 * 2열 기록 타일의 칸 너비. 넓은 타일 앞뒤로 반 칸 타일이 줄에 혼자 남으면
 * (다음이 넓은 타일이거나 마지막) 그것도 한 줄로 늘려서 옆이 비어 보이지 않게 한다.
 */
export function wideLayout(tiles: { wide?: boolean }[]): boolean[] {
  const out: boolean[] = [];
  let col = 0;
  for (let i = 0; i < tiles.length; i++) {
    const next = tiles[i + 1];
    const wide = !!tiles[i].wide || (col === 0 && (!next || !!next.wide));
    out.push(wide);
    col = wide ? 0 : (col + 1) % 2;
  }
  return out;
}
