"use client";

import { useEffect, useRef } from "react";

/**
 * 샘플 대화로 "AI 분석 시작"을 눌렀을 때: 결제·AI 분석 대신
 * 미리 만든 샘플 결과를 보거나, 내 대화를 올리러 가게 한다.
 */
export function SampleChoice({
  open,
  onClose,
  onSample,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  onSample: () => void;
  onUpload: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="sample-choice-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto mb-0 w-full max-w-[480px] rounded-t-[28px] bg-dusk p-0 text-moon backdrop:bg-night/80 backdrop:backdrop-blur-sm sm:mb-auto sm:rounded-[28px]"
    >
      <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h2 id="sample-choice-title" className="text-[20px] font-extrabold tracking-[-0.02em]">
          지금은 샘플 대화예요
        </h2>
        <p className="mt-2 text-[14px] leading-[1.6] text-haze">
          샘플 대화는 결제 없이 미리 만들어 둔 결과로 보여드려요. 우리 방을 분석하려면 카카오톡에서 내보낸 대화 파일을 올려 주세요.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onSample}
            className="h-12 rounded-[14px] bg-spark text-[15px] font-bold text-spark-ink"
          >
            샘플 결과 보기
          </button>
          <button type="button" onClick={onUpload} className="h-12 rounded-[14px] bg-dusk-2 text-[15px] font-semibold">
            내 대화 올리기
          </button>
        </div>
      </div>
    </dialog>
  );
}
