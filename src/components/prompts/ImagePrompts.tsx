"use client";

import { useState } from "react";
import type { Report } from "@/lib/llm/schema";
import { bagPrompt, facePrompt, groupPrompt, roomPrompt } from "@/lib/imagePrompt/build";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          window.prompt("복사해 주세요", text);
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="rounded-full bg-dusk-2 px-3 py-1.5 text-[13px] font-semibold"
    >
      {done ? "복사했어요" : label}
    </button>
  );
}

/** 이미지 생성 서비스에 붙여넣을 프롬프트 (이 서비스는 이미지를 만들지 않는다) */
export function ImagePrompts({ report, colorOf }: { report: Report; colorOf: (n: string) => string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] leading-[1.55] text-haze">
        이미지 생성 서비스에 붙여넣으면 캐리커처를 만들 수 있어요. 실제 얼굴처럼 보이지 않게 스타일을 고정했고 이름은 넣지 않았어요.
      </p>
      <div className="rounded-[var(--radius-card)] bg-dusk p-4">
        <p className="text-[15px] font-semibold">단체 사진</p>
        <div className="mt-2">
          <CopyButton text={groupPrompt(report)} label="프롬프트 복사" />
        </div>
      </div>
      {report.members.map((m) => (
        <div key={m.name} className="rounded-[var(--radius-card)] bg-dusk p-4">
          <p className="text-[15px] font-semibold" style={{ color: colorOf(m.name) }}>
            {m.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <CopyButton text={facePrompt(m)} label="얼굴 (웹툰체)" />
            <CopyButton text={roomPrompt(m)} label="방 (아이소메트릭)" />
            <CopyButton text={bagPrompt(m)} label="가방 (픽셀)" />
          </div>
        </div>
      ))}
    </div>
  );
}
