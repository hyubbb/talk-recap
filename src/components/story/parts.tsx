"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export const n = (v: number) => v.toLocaleString("ko-KR");
export const fmt = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};
export const md = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};
export const clock = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};
export const clean = (s: string) => s.replace(/\(목업\)\s*/g, "").trim();

export function Big({ children }: { children: React.ReactNode }) {
  return <p className="tabular text-[clamp(48px,16cqw,84px)] leading-[1.02] font-black tracking-[-0.04em]">{children}</p>;
}

export function Line({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[17px] leading-[1.5] font-semibold">{children}</p>;
}

/** 대화에서 꺼낸 말한마디. 카톡 말풍선 모양 (right = 보낸 메시지처럼 오른쪽) */
export function Bubble({ text, ink, right, faint }: { text: string; ink: string; right?: boolean; faint?: boolean }) {
  return (
    <span
      className={`max-w-[80%] truncate px-3.5 py-1.5 text-[15px] font-semibold ${right ? "self-end rounded-[18px] rounded-br-[4px]" : "self-start rounded-[18px] rounded-bl-[4px]"}`}
      style={{ background: `${ink}${faint ? "14" : "22"}` }}
    >
      {text}
    </span>
  );
}

/** 가운데 제목. 관련 말은 제목 아래 오른쪽에 보낸 메시지처럼 쌓는다 */
export function Hero({ words = [], ink, children }: { words?: string[]; ink: string; children: React.ReactNode }) {
  return (
    <div className="my-auto flex flex-col items-center gap-6 py-6 text-center">
      <div className="flex flex-col items-center">{children}</div>
      {words.length > 0 && (
        <div className="flex w-full flex-col items-end gap-1.5" aria-hidden>
          {words.map((w) => (
            <Bubble key={w} text={w} ink={ink} right />
          ))}
        </div>
      )}
    </div>
  );
}

/** 0에서 목표값까지 올라가는 숫자 (모션 줄이기 설정이면 바로 목표값) */
export function Count({ to, digits = 0, ms = 900 }: { to: number; digits?: number; ms?: number }) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setV(to * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, reduced]);
  const shown = reduced ? to : v;
  return <>{digits ? shown.toFixed(digits) : n(Math.round(shown))}</>;
}

/** 순서대로 하나씩 나타나게 하는 지연 (bubble-in과 같이 쓴다) */
export const delay = (i: number, step = 160, base = 200) => ({ animationDelay: `${base + i * step}ms` });
