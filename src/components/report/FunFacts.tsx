import type { ReactNode } from "react";
import type { FunFact } from "@/lib/kakao/fun";
import { wideLayout } from "@/lib/ui/tiles";

/** 기록 타일 한 칸: 이름표·큰 숫자·주인공·설명 (extra는 설명 아래 말풍선 등) */
export interface Tile {
  key: string;
  label: string;
  value: string;
  caption: string;
  who: string[];
  /** 항상 한 줄을 다 쓴다 (이름이 둘이거나 글자가 긴 값) */
  wide?: boolean;
  extra?: ReactNode;
}

/** 2열 타일 (칸 너비는 wideLayout) */
export function TileGrid({ tiles, nameOf, colorOf }: { tiles: Tile[]; nameOf: (id: string) => string; colorOf: (id: string) => string }) {
  const wideAt = wideLayout(tiles);
  return (
    <ul className="grid grid-cols-2 gap-2.5">
      {tiles.map((f, i) => (
        <li key={f.key} className={`flex min-w-0 flex-col rounded-[16px] bg-dusk p-4 ${wideAt[i] ? "col-span-2" : ""}`}>
          <p className="font-pixel text-[12px] text-spark">{f.label}</p>
          <p className="tabular mt-2 truncate text-[30px] leading-[1.1] font-black tracking-[-0.03em]">{f.value}</p>
          {f.who.length > 0 && (
            <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] font-bold">
              {f.who.map((id, k) => (
                <span key={id} className="flex min-w-0 items-center gap-1.5">
                  {k > 0 && <span className="font-normal text-haze">↔</span>}
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(id) }} />
                  <span className="truncate">{nameOf(id)}</span>
                </span>
              ))}
            </p>
          )}
          <p className="mt-1 text-[13px] leading-[1.45] text-haze">{f.caption}</p>
          {f.extra}
        </li>
      ))}
    </ul>
  );
}

/** 이름이 둘인 랠리, 글자가 긴 유행어는 한 줄을 다 쓴다 */
const WIDE_FACTS = new Set<FunFact["key"]>(["rally", "origin"]);

/** "숫자로 본 우리 방": 기록마다 이름표·큰 숫자·주인공·설명이 있는 타일 */
export function FunFacts({ facts, nameOf, colorOf }: { facts: FunFact[]; nameOf: (id: string) => string; colorOf: (id: string) => string }) {
  const tiles = facts.map((f) => ({ key: f.key, label: f.label, value: f.value, caption: f.caption, who: f.who, wide: WIDE_FACTS.has(f.key) }));
  return <TileGrid tiles={tiles} nameOf={nameOf} colorOf={colorOf} />;
}
