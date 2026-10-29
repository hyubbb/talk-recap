"use client";

import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { AnalysisProgress } from "./AnalysisProgress";
import { analysisAtom } from "@/state/analysis";

/**
 * AI 분석 중에는 화면 전체를 덮어서 페이지를 벗어나거나 다른 걸 건드리지 않게 한다.
 * - pending: 분석 버튼을 누른 직후(구간 준비 중)부터 결과 페이지로 넘어갈 때까지
 * - 실행 중에는 새로고침·탭 닫기 시 브라우저 경고, 배경 스크롤 잠금, Esc 무시
 * - 실패하면 "다시 시도" / "닫기"
 */
export function AnalysisOverlay({ pending, onRetry }: { pending: boolean; onRetry: () => void }) {
  const [state, setState] = useAtom(analysisAtom);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isError = state.kind === "error";
  const isDone = state.kind === "done";
  const open = pending || state.kind === "running" || isError || isDone;
  const busy = open && !isError;

  // 배경 스크롤 잠금 + 포커스를 대화상자로
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 분석 중 새로고침·탭 닫기 경고
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  // 포커스가 대화상자 밖으로 나가지 않게 (Tab 순환), 분석 중 Esc 무시
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (isError) setState({ kind: "idle" });
      return;
    }
    if (e.key !== "Tab") return;
    const items = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!items || items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  const title = isError
    ? "분석이 멈췄어요"
    : isDone
      ? "다 됐어요! 결과로 이동하는 중"
      : "AI가 대화를 읽고 있어요";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/85 backdrop-blur-sm sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-overlay-title"
        aria-describedby="analysis-overlay-desc"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="bubble-in w-full max-w-[480px] rounded-t-[28px] bg-dusk p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] outline-none sm:rounded-[28px]"
      >
        <div className="flex items-center gap-3">
          {!isError && (
            <span className="relative flex size-3 shrink-0" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-spark opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-3 rounded-full bg-spark" />
            </span>
          )}
          <h2 id="analysis-overlay-title" className="text-[20px] font-extrabold tracking-[-0.02em]">
            {title}
          </h2>
        </div>
        <p id="analysis-overlay-desc" className="mt-2 text-[14px] leading-[1.6] text-haze">
          {isError
            ? "일부 구간이나 종합 단계에서 오류가 났어요. 다시 시도하면 처음부터 다시 분석해요."
            : "보통 1~3분 걸려요. 이 화면을 닫거나 다른 페이지로 이동하면 분석이 멈추니 잠시만 기다려 주세요."}
        </p>

        <div className="mt-5">
          {state.kind === "idle" ? (
            <p className="text-[15px]" role="status">
              대화를 구간으로 나누는 중…
            </p>
          ) : (
            <AnalysisProgress embedded />
          )}
        </div>

        {isError && (
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setState({ kind: "idle" })}
              className="h-12 flex-1 rounded-[14px] bg-dusk-2 text-[15px] font-semibold text-moon"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="h-12 flex-[2] rounded-[14px] bg-spark text-[15px] font-bold text-spark-ink"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
