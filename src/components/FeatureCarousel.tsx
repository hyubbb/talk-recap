"use client";

import { useRef, useState, type ReactNode } from "react";
import { ItemIcon } from "@/components/bag/PixelIcon";
import { memberColor } from "@/lib/ui/colors";

// 랜딩 미리보기: 결과에서 볼 수 있는 것들을 옆으로 넘겨 보는 카드. 숫자·이름은 모두 지어낸 예시.

function Avatar({ name, color }: { name: string; color: number }) {
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-bold text-night"
      style={{ background: memberColor(color) }}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <p className="font-pixel text-[13px]">{children}</p>;
}

// 0~23시 메시지 비율 (예시)
const HOURS = [5, 3, 2, 1, 0, 0, 0, 1, 2, 3, 3, 4, 6, 5, 4, 4, 5, 6, 7, 8, 9, 10, 9, 7];

const SLIDES: { key: string; label: string; node: ReactNode }[] = [
  {
    key: "award",
    label: "어워드",
    node: (
      <div className="flex h-full flex-col rounded-[18px] p-5 text-night" style={{ background: memberColor(0) }}>
        <Tag>말버릇 왕</Tag>
        <p className="tabular mt-auto text-[48px] leading-none font-black tracking-[-0.04em]">1,175번</p>
        <p className="mt-2 text-[14px] font-medium">도토리가 100일 동안 &lsquo;흠&rsquo;을 보낸 횟수</p>
      </div>
    ),
  },
  {
    key: "stats",
    label: "통계",
    node: (
      <div className="flex h-full flex-col rounded-[18px] bg-dusk-2 p-5">
        <Tag>
          <span className="text-spark">시간대 통계</span>
        </Tag>
        <p className="mt-2 text-[20px] font-extrabold tracking-[-0.02em]">밤 9시에 가장 시끄러운 방</p>
        <div className="mt-auto flex h-20 items-end gap-[3px]" aria-hidden>
          {HOURS.map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-[2px]"
              style={{ height: `${Math.max(h, 0.4) * 10}%`, background: i === 21 ? "var(--color-spark)" : "var(--color-haze)", opacity: i === 21 ? 1 : 0.45 }}
            />
          ))}
        </div>
        <p className="tabular mt-2 flex justify-between text-[11px] text-haze">
          <span>0시</span>
          <span>12시</span>
          <span>23시</span>
        </p>
      </div>
    ),
  },
  {
    key: "match",
    label: "궁합",
    node: (
      <div className="flex h-full flex-col rounded-[18px] bg-dusk-2 p-5">
        <Tag>
          <span className="text-spark">상성 1위</span>
        </Tag>
        <div className="mt-3 flex items-center gap-2">
          <Avatar name="도토리" color={0} />
          <span className="text-[18px] text-haze">×</span>
          <Avatar name="고등어" color={3} />
          <span className="font-pixel tabular ml-auto text-[40px] leading-none text-spark">92</span>
        </div>
        <p className="mt-auto text-[15px] leading-[1.55]">
          고등어가 놀리면 도토리가 1분 안에 받아쳐요. 서로 답장이 제일 빠른 사이.
        </p>
      </div>
    ),
  },
  {
    key: "mbti",
    label: "MBTI",
    node: (
      <div className="flex h-full flex-col rounded-[18px] bg-dusk-2 p-5">
        <div className="flex items-center gap-2">
          <Avatar name="감자" color={2} />
          <div>
            <p className="text-[15px] font-semibold">감자</p>
            <p className="text-[12px] text-haze">대화로 추론한 MBTI</p>
          </div>
        </div>
        <div className="mt-4 flex gap-1.5">
          {["E", "N", "F", "J"].map((c) => (
            <span key={c} className="font-pixel grid size-11 place-items-center rounded-[12px] bg-night text-[20px] text-spark">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-auto text-[14px] leading-[1.55] text-haze">약속 날짜는 항상 감자가 먼저 꺼내요. 그래서 J.</p>
      </div>
    ),
  },
  {
    key: "bag",
    label: "가방",
    node: (
      <div className="flex h-full flex-col rounded-[18px] p-5 text-night" style={{ background: memberColor(3) }}>
        <Tag>WHAT&apos;S IN MY BAG</Tag>
        <p className="mt-1 text-[20px] font-extrabold">고등어</p>
        <div className="mt-auto grid grid-cols-3 gap-2">
          {["휴대폰", "무선 이어폰", "텀블러"].map((it) => (
            <div key={it} className="flex flex-col items-center gap-1 rounded-[12px] bg-moon/85 py-2">
              <ItemIcon item={it} size={36} />
              <span className="font-pixel text-[11px]">{it}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: "quiz",
    label: "퀴즈",
    node: (
      <div className="flex h-full flex-col rounded-[18px] bg-dusk-2 p-5">
        <Tag>
          <span className="text-spark">우리 방 퀴즈</span>
        </Tag>
        <p className="mt-2 text-[17px] font-bold">&lsquo;흠&rsquo;을 제일 많이 보낸 사람은?</p>
        <ul className="mt-auto flex flex-col gap-1.5 text-[14px]">
          {[
            ["도토리", true],
            ["고등어", false],
            ["감자", false],
          ].map(([n, ok]) => (
            <li
              key={n as string}
              className={`flex justify-between rounded-[12px] px-3 py-2 ${ok ? "bg-spark font-bold text-spark-ink" : "bg-night text-haze"}`}
            >
              {n}
              {ok && <span>정답</span>}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

/** 결과에서 볼 수 있는 기능 미리보기. 옆으로 밀거나 아래 점을 눌러 넘긴다 */
export function FeatureCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / (el.firstElementChild as HTMLElement).offsetWidth);
    if (i !== index) setIndex(Math.min(SLIDES.length - 1, Math.max(0, i)));
  };
  // 마우스로 잡아 끌어서 넘기기 (터치는 브라우저 기본 스와이프를 그대로 쓴다)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !track.current) return;
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
    track.current.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !track.current) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 3) d.moved = true;
    track.current.scrollLeft = d.left - dx;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = track.current;
    if (!d || !el) return;
    drag.current = null;
    el.releasePointerCapture(e.pointerId);
    setDragging(false);
    // 조금만 끌어도 넘어가게: 끈 방향으로 한 장
    const w = (el.firstElementChild as HTMLElement).offsetWidth;
    const from = Math.round(d.left / w);
    const dx = e.clientX - d.x;
    const to = Math.abs(dx) > 40 ? from + (dx < 0 ? 1 : -1) : from;
    go(Math.min(SLIDES.length - 1, Math.max(0, to)));
  };

  const go = (i: number) => {
    const el = track.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (el && slide) el.scrollTo({ left: slide.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  return (
    <section className="mt-6" aria-roledescription="carousel" aria-label="결과 미리보기">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[14px] font-semibold text-haze">결과에서 이런 걸 볼 수 있어요</p>
        <p className="tabular text-[13px] text-haze" aria-live="polite">
          {SLIDES[index].label} {index + 1}/{SLIDES.length}
        </p>
      </div>
      <div
        ref={track}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDragStart={(e) => e.preventDefault()}
        className={`-mx-5 flex gap-3 ${dragging ? "cursor-grabbing select-none" : "snap-x snap-mandatory cursor-grab"} overflow-x-auto scroll-px-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.key}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1}/${SLIDES.length} ${s.label}`}
            className="h-[220px] w-[86%] shrink-0 snap-start"
          >
            {s.node}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => go(i)}
            aria-label={`${s.label} 보기`}
            aria-current={i === index}
            className={`h-2 rounded-full transition-all ${i === index ? "w-5 bg-spark" : "w-2 bg-dusk-2"}`}
          />
        ))}
      </div>
    </section>
  );
}
