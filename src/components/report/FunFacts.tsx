import type { ReactNode } from "react";
import type { FunFact } from "@/lib/kakao/fun";
import type { RecordFact } from "@/lib/kakao/records";
import { wideLayout } from "@/lib/ui/tiles";

/** 기록 타일 한 칸: 이름표·큰 숫자·주인공·설명 (extra는 설명 아래 말풍선 등) */
export interface Tile {
  key: string;
  label: string;
  value: string;
  caption: string;
  who: string[];
  /** who 사이를 →로 (한쪽 방향), 기본은 ↔ */
  arrow?: boolean;
  /** 항상 한 줄을 다 쓴다 (이름이 둘이거나 글자가 긴 값) */
  wide?: boolean;
  extra?: ReactNode;
}

/** 대화에서 꺼낸 한 줄을 말풍선으로 */
export function QuoteBubble({ text }: { text: string }) {
  return (
    <span className="mt-3 max-w-full self-start truncate rounded-[18px] rounded-bl-[4px] bg-dusk-2 px-3.5 py-1.5 text-[14px] font-semibold">
      {text}
    </span>
  );
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
                  {k > 0 && <span className="font-normal text-haze">{f.arrow ? "→" : "↔"}</span>}
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

/** 이름이 둘인 기록, 글자가 긴 유행어, 말풍선이 붙는 기록은 한 줄을 다 쓴다 */
const WIDE = new Set<string>(["rally", "origin", "jinx", "oneway", "ghost"]);

/** "숫자로 본 우리 방" 타일: 웃음·허공·랠리… 다음에 잠수·부르면 출동·텔레파시… */
export function factTiles(facts: FunFact[], records: RecordFact[]): Tile[] {
  const out: Tile[] = facts.map((f) => ({ key: f.key, label: f.label, value: f.value, caption: f.caption, who: f.who, wide: WIDE.has(f.key) }));
  for (const r of records) {
    out.push({
      key: r.key, label: r.label, value: r.value, caption: r.caption, who: r.who, arrow: r.arrow, wide: WIDE.has(r.key),
      extra: r.quote ? <QuoteBubble text={r.quote} /> : undefined,
    });
  }
  return out;
}
