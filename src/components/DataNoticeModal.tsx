"use client";

import { useRef } from "react";
import { DataNotice } from "@/components/DataNotice";

/** "자세히 보기"를 누르면 "내 대화는 어디로 가나요?"(데이터 처리 안내)를 모달로 보여준다. 첫 화면·대화 올리기에서 쓴다 */
export function DataNoticeModal({ className = "", label = "자세히 보기" }: { className?: string; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => {
    ref.current?.showModal();
    document.body.style.overflow = "hidden";
  };
  const close = () => ref.current?.close();

  return (
    <>
      <button type="button" onClick={open} className={`text-[14px] font-semibold text-spark underline underline-offset-4 ${className}`}>
        {label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="data-notice-title"
        onClose={() => (document.body.style.overflow = "")}
        // 바깥(어두운 배경)을 누르면 닫기
        onClick={(e) => e.target === ref.current && close()}
        className="m-auto mb-0 max-h-[85dvh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] bg-night p-0 text-moon backdrop:bg-night/80 backdrop:backdrop-blur-sm sm:mb-auto sm:rounded-[28px]"
      >
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="data-notice-title" className="text-[20px] font-bold tracking-[-0.02em]">
              내 대화는 어디로 가나요?
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-dusk-2 text-[18px] text-haze"
            >
              ×
            </button>
          </div>
          <DataNotice />
          <button
            type="button"
            onClick={close}
            className="mt-5 h-12 w-full rounded-[14px] bg-spark text-[15px] font-bold text-spark-ink"
          >
            확인했어요
          </button>
        </div>
      </dialog>
    </>
  );
}
