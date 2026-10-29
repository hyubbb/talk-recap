"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SavedReport } from "@/lib/report/storage";
import { buildSlides, inkOn } from "@/lib/story/slides";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SaveImageButton, Watermark } from "@/components/cards/SaveImageButton";
import { SlideContent, type SlideActions } from "./SlideContent";

/**
 * 9:16 스토리 슬라이드.
 * 화면 왼쪽 탭 = 이전, 오른쪽 탭 = 다음, 좌우 스와이프, 키보드 ←/→, Esc = 닫기(리포트로).
 */
export function Story({
  saved,
  me,
  onClose,
  onQuiz,
  onShare,
}: {
  saved: SavedReport;
  me?: string | null;
  onClose: () => void;
  onQuiz?: () => void;
  onShare?: () => void;
}) {
  const slides = useMemo(() => buildSlides(saved, me), [saved, me]);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const slide = slides[index];
  const ink = inkOn(slide.bg);

  const go = useCallback((d: number) => setIndex((i) => Math.min(slides.length - 1, Math.max(0, i + d))), [slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) return go(dx < 0 ? 1 : -1);
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    go(e.clientX - rect.left < rect.width / 3 ? -1 : 1);
  };

  const actions: SlideActions = { onReport: onClose, onQuiz, onShare };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-night"
      role="dialog"
      aria-modal="true"
      aria-label="스토리"
    >
      <div
        ref={frameRef}
        className="relative flex aspect-[9/16] w-[min(100vw,calc((100dvh-56px)*9/16))] touch-pan-y flex-col overflow-hidden select-none sm:rounded-[20px] [container-type:inline-size]"
        style={{ background: slide.bg, color: ink, transition: reduced ? "none" : "background-color 300ms ease" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="flex gap-1 px-3 pt-3" data-no-capture aria-hidden>
          {slides.map((s, i) => (
            <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full" style={{ background: `${ink}40` }}>
              <span className="block h-full rounded-full" style={{ width: i <= index ? "100%" : "0%", background: ink }} />
            </span>
          ))}
        </div>
        <button
          type="button"
          data-no-capture
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={onClose}
          className="absolute top-6 right-3 z-10 grid size-9 place-items-center rounded-full text-[20px]"
          style={{ color: ink }}
          aria-label="닫고 리포트 보기"
        >
          ×
        </button>

        <section
          key={slide.id}
          aria-roledescription="슬라이드"
          aria-labelledby={`slide-title-${index}`}
          className={`flex flex-1 flex-col px-[8%] pt-10 pb-[12%] ${reduced ? "" : "bubble-in"}`}
        >
          <h2 id={`slide-title-${index}`} className="sr-only">
            {index + 1}/{slides.length} {slide.title}
          </h2>
          <SlideContent slide={slide} saved={saved} ink={ink} actions={actions} />
        </section>
        <Watermark ink={ink} />
      </div>

      <p className="sr-only" aria-live="polite">
        {index + 1}번째 장, 전체 {slides.length}장: {slide.title}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => go(-1)} disabled={index === 0} className="rounded-full px-3 py-2 text-[14px] text-haze disabled:opacity-30">
          이전
        </button>
        <SaveImageButton target={frameRef} fileName={`tokbang-story-${index + 1}.png`} width={1080} height={1920} />
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === slides.length - 1}
          className="rounded-full px-3 py-2 text-[14px] text-haze disabled:opacity-30"
        >
          다음
        </button>
      </div>
    </div>
  );
}
