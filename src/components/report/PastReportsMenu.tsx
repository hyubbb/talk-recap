"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { analyzedAt, day, useSavedReports } from "@/components/upload/RecentReports";

/** 결과 페이지 상단 "지난 결과": 이 브라우저에서 돌린 다른 분석으로 바로 이동 */
export function PastReportsMenu({ currentId }: { currentId: string }) {
  const items = useSavedReports();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  // 지금 보는 것 말고 다른 결과가 없으면 버튼을 숨긴다
  if (!items.some((r) => r.id !== currentId)) return null;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="text-[14px] text-haze hover:text-moon"
      >
        지난 결과
      </button>
      {open && (
        <ul className="absolute right-0 z-40 mt-2 w-[min(300px,calc(100vw-40px))] overflow-hidden rounded-[16px] bg-dusk-2 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
          {items.map((r) => {
            const here = r.id === currentId;
            return (
              <li key={r.id}>
                <Link
                  href={`/r/${r.id}`}
                  onClick={() => setOpen(false)}
                  aria-current={here ? "page" : undefined}
                  className={`block rounded-[12px] px-3 py-2.5 ${here ? "bg-night" : "hover:bg-dusk"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[14px] font-semibold">{r.title}</span>
                    {here && <span className="shrink-0 text-[12px] text-spark">보는 중</span>}
                  </span>
                  <span className="tabular mt-0.5 block text-[12px] text-haze">
                    {r.start ? `${day(r.start)} ~ ${day(r.end)} · ` : ""}멤버 {r.memberCount}명
                    <br />
                    {analyzedAt(r.createdAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
