"use client";

import { useState } from "react";
import type { SavedReport } from "@/lib/report/storage";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MemberCard } from "@/components/cards/MemberCard";

const STEP_LABEL = ["", "MBTI 보기", "가방 열기", "스토리 보기"];

/**
 * "나는 누구?" 이름을 고르면 카드가 한 번 뒤집히며 아키타입 → MBTI → 가방 순서로 공개된다.
 * 본인 확인은 없다. 고른 이름은 이 브라우저에만 저장한다(onDone에서).
 */
export function PickMe({ saved, onDone }: { saved: SavedReport; onDone: (name: string) => void }) {
  const [name, setName] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [step, setStep] = useState(1);
  const reduced = useReducedMotion();
  const member = saved.report.members.find((m) => m.name === name);
  const color = saved.members.find((m) => m.name === name)?.color ?? "#ffc53d";

  if (!member) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 py-10">
        <p className="font-pixel text-[15px] text-spark">톡방 Wrapped</p>
        <h1 className="mt-3 text-[28px] leading-[1.25] font-extrabold tracking-[-0.03em]">{saved.report.title}</h1>
        <p className="mt-6 text-[20px] font-bold">나는 누구?</p>
        <p className="mt-1 text-[14px] text-haze">내 이름을 고르면 내 카드부터 보여줘요. 이 브라우저에만 기억해요.</p>
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {saved.members.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  setName(m.name);
                  requestAnimationFrame(() => setTimeout(() => setFlipped(true), reduced ? 0 : 350));
                }}
                className="flex h-14 w-full items-center gap-2 rounded-[16px] bg-dusk px-4 text-left text-[16px] font-semibold"
              >
                <span className="size-3 shrink-0 rounded-full" style={{ background: m.color }} aria-hidden />
                <span className="truncate">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => onDone("")} className="mt-6 self-center text-[15px] text-haze underline-offset-4 hover:underline">
          구경만 할게요
        </button>
      </main>
    );
  }

  const front = <MemberCard member={member} color={color} step={step} />;
  const back = (
    <div className="grid aspect-[4/5] w-full place-items-center rounded-[var(--radius-card)] bg-dusk-2">
      <span className="font-pixel text-[22px] text-spark">?</span>
    </div>
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center px-5 py-10">
      <p className="text-[15px] text-haze" aria-live="polite">
        {flipped ? `${member.name}의 카드` : "카드를 뒤집는 중…"}
      </p>
      <div className="mt-4 w-full [perspective:1200px]">
        {reduced ? (
          // 모션 줄이기: 뒤집기 대신 페이드
          <div className="relative">
            <div className={`transition-opacity duration-300 ${flipped ? "opacity-0" : "opacity-100"}`}>{back}</div>
            <div className={`absolute inset-0 transition-opacity duration-300 ${flipped ? "opacity-100" : "opacity-0"}`}>{front}</div>
          </div>
        ) : (
          <div
            className="relative transition-transform duration-700 [transform-style:preserve-3d]"
            style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
          >
            <div className="[backface-visibility:hidden]">{back}</div>
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">{front}</div>
          </div>
        )}
      </div>
      <button
        type="button"
        disabled={!flipped}
        onClick={() => (step < 3 ? setStep(step + 1) : onDone(member.name))}
        className="mt-6 h-14 w-full rounded-[16px] bg-spark text-[17px] font-bold text-spark-ink disabled:opacity-40"
      >
        {STEP_LABEL[step]}
      </button>
      <button type="button" onClick={() => setName(null)} className="mt-3 text-[14px] text-haze">
        다른 이름 고르기
      </button>
    </main>
  );
}
