"use client";

import { useState, type RefObject } from "react";
import { saveNodeAsPng } from "@/lib/ui/savePng";

/** 카드·슬라이드를 PNG로 저장. 목표 픽셀 크기: 스토리 1080×1920, 피드 1080×1350(기본) */
export function SaveImageButton({
  target,
  fileName,
  width = 1080,
  height = 1350,
  label = "이미지 저장",
  className = "",
  footer = false,
}: {
  target: RefObject<HTMLElement | null>;
  fileName: string;
  width?: number;
  height?: number;
  label?: string;
  className?: string;
  /** 저장 이미지 아래에 로고 띠 붙이기 */
  footer?: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const run = async () => {
    if (!target.current) return;
    setState("busy");
    try {
      await saveNodeAsPng(target.current, { width, height, fileName, footer });
      setState("done");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("error");
    }
  };
  return (
    <button
      type="button"
      data-no-capture
      onClick={run}
      disabled={state === "busy"}
      className={`rounded-full bg-dusk-2 px-4 py-2 text-[14px] font-semibold text-moon disabled:opacity-50 ${className}`}
    >
      {state === "busy" ? "만드는 중…" : state === "done" ? "저장했어요" : state === "error" ? "다시 시도" : label}
    </button>
  );
}

/** 카드·슬라이드 구석 워터마크 */
export function Watermark({ ink }: { ink: string }) {
  return (
    <span
      data-watermark
      className="font-pixel pointer-events-none absolute right-[5%] bottom-[3%] text-[11px] opacity-70"
      style={{ color: ink }}
    >
      톡방 Wrapped
    </span>
  );
}
