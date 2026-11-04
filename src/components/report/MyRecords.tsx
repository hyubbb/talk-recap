"use client";

import { useState } from "react";
import type { RoomStats } from "@/lib/kakao/stats";
import { myFacts } from "@/lib/report/mine";
import { TileGrid } from "./FunFacts";

/**
 * "내 기록": 한 사람 기준으로 다시 묶은 숫자. 공유 링크에서 "나는 누구?"로 고른 이름이 있으면 그 사람부터.
 * 이름 칩으로 다른 사람 기록도 볼 수 있다.
 */
export function MyRecords({
  stats,
  members,
  me,
}: {
  stats: RoomStats;
  members: { id: string; name: string; color: string }[];
  me?: string | null;
}) {
  const initial = members.find((m) => m.name === me)?.id ?? null;
  const [picked, setPicked] = useState<string | null>(null);
  const current = picked ?? initial;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "누군가";
  const colorOf = (id: string) => members.find((m) => m.id === id)?.color ?? "var(--color-haze)";
  const facts = current ? myFacts(stats, current) : [];
  const WIDE = new Set(["buddy", "phrase"]);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-1.5" aria-label="누구 기록을 볼까요?">
        {members.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setPicked(m.id)}
              aria-pressed={current === m.id}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-semibold transition ${current === m.id ? "bg-moon text-night" : "bg-dusk"}`}
            >
              <span className="size-2.5 rounded-full" style={{ background: m.color }} />
              {m.name}
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <TileGrid tiles={facts.map((f) => ({ ...f, wide: WIDE.has(f.key) }))} nameOf={nameOf} colorOf={colorOf} />
      ) : (
        <p className="text-[14px] text-haze">이름을 누르면 그 사람 기준으로 순위·단짝·잠수 기록을 모아 보여줘요</p>
      )}
    </div>
  );
}
