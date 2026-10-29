"use client";

import { forwardRef } from "react";
import type { Report } from "@/lib/llm/schema";
import { inkOn } from "@/lib/story/slides";
import { initialOf } from "@/lib/ui/colors";
import { ItemIcon } from "@/components/bag/PixelIcon";
import { Watermark } from "./SaveImageButton";

type Member = Report["members"][number];

/** 멤버 카드 (4:5, 1080×1350). 아키타입 → MBTI → 가방 순서 */
export const MemberCard = forwardRef<HTMLDivElement, { member: Member; color: string; step?: number }>(function MemberCard(
  { member, color, step = 3 },
  ref,
) {
  const ink = inkOn(color);
  return (
    <div
      ref={ref}
      className="relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-[var(--radius-card)] p-[7%]"
      style={{ background: color, color: ink }}
    >
      <div className="flex items-center gap-2 text-[15px] font-semibold">
        <span className="grid size-7 place-items-center rounded-full text-[13px]" style={{ background: "#17142e26" }}>
          {initialOf(member.name)}
        </span>
        {member.name}
      </div>
      <p className="mt-[8%] text-[13px] font-semibold opacity-75">아키타입</p>
      <p className="mt-1 text-[28px] leading-[1.2] font-extrabold tracking-[-0.03em]">{member.archetype}</p>
      {member.oneLiner && <p className="mt-2 text-[15px] leading-[1.45] font-semibold opacity-85">&ldquo;{member.oneLiner}&rdquo;</p>}
      {step >= 2 && (
        <div className="mt-[8%] bubble-in">
          <p className="text-[13px] font-semibold opacity-75">행동으로 본 MBTI</p>
          <p className="font-pixel mt-1 text-[36px] leading-none">{member.mbti.type}</p>
          {member.mbti.claimed && member.mbti.claimed !== member.mbti.type && (
            <p className="mt-1 text-[13px] opacity-80">
              본인 주장 <s>{member.mbti.claimed}</s>
            </p>
          )}
        </div>
      )}
      {step >= 3 && (
        <div className="bubble-in mt-auto mb-[9%]">
          <p className="text-[13px] font-semibold opacity-75">가방 속</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {member.bag.items.slice(0, 6).map((it, i) => (
              <li key={i} className="rounded-[8px] bg-moon/90 p-1" title={it.item}>
                <ItemIcon item={it.item} size={28} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <Watermark ink={ink} />
    </div>
  );
});
