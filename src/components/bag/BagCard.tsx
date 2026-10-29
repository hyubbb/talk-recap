"use client";

import { forwardRef } from "react";
import type { Report } from "@/lib/llm/schema";
import { inkOn } from "@/lib/story/slides";
import { ItemIcon } from "./PixelIcon";

type Member = Report["members"][number];

const clean = (s: string) => s.replace(/\(목업\)\s*/g, "").trim();

/** What's in my bag 픽셀 카드 (4:5, 1080×1350으로 저장). 로고는 화면에 없고 저장할 때만 아래 띠로 붙는다 */
export const BagCard = forwardRef<HTMLDivElement, { member: Member; color: string }>(function BagCard({ member, color }, ref) {
  const ink = inkOn(color);
  const items = member.bag.items.slice(0, 10);
  return (
    <div
      ref={ref}
      className="relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-[var(--radius-card)] p-[6%]"
      style={{ background: color, color: ink }}
    >
      <p className="font-pixel text-[13px] opacity-80">WHAT&apos;S IN MY BAG</p>
      <p className="mt-1 text-[22px] leading-[1.2] font-extrabold tracking-[-0.02em]">{member.name}</p>
      <div className="mt-3 flex items-center gap-2">
        <span className="font-pixel rounded-full px-3 py-1 text-[12px]" style={{ background: "#17142e", color: "#f3efff" }}>
          {clean(member.bag.bag) || "가방"}
        </span>
      </div>
      <ul className="mt-[5%] grid flex-1 grid-cols-3 content-start gap-x-2 gap-y-3 rounded-[16px] p-3" style={{ background: "#17142e22" }}>
        {items.map((it, i) => (
          <li key={i} className="flex flex-col items-center gap-1 text-center">
            <span className="grid place-items-center rounded-[10px] bg-moon/90 p-1.5">
              <ItemIcon item={it.item} size={40} />
            </span>
            <span className="font-pixel line-clamp-2 text-[11px] leading-[1.3]">{clean(it.item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});
