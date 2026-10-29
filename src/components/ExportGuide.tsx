"use client";

import { useState } from "react";

const GUIDES = {
  아이폰: [
    "단톡방에 들어가 오른쪽 위 메뉴(≡)를 눌러요.",
    "아래쪽 설정(톱니바퀴)을 눌러요.",
    "\"대화 내용 내보내기\"에서 \"텍스트만 보내기\"를 골라요.",
    "파일 앱에 저장한 뒤, 여기서 그 파일(zip 또는 txt)을 올려요.",
  ],
  안드로이드: [
    "단톡방에 들어가 오른쪽 위 메뉴(≡)를 눌러요.",
    "설정(톱니바퀴)에서 \"대화 내용 내보내기\"를 눌러요.",
    "\"텍스트만 보내기\"를 골라 기기에 저장해요.",
    "저장된 txt 파일을 여기서 올려요.",
  ],
  PC: [
    "PC 카카오톡에서 단톡방을 열어요.",
    "오른쪽 위 메뉴(≡)에서 \"대화 내용\" → \"대화 내보내기\"를 골라요.",
    "txt로 저장한 뒤 여기서 올려요.",
  ],
} as const;

type Tab = keyof typeof GUIDES;

export function ExportGuide() {
  const [tab, setTab] = useState<Tab>("아이폰");
  return (
    <div className="mt-4">
      <div role="tablist" className="flex gap-1 rounded-[14px] bg-dusk p-1">
        {(Object.keys(GUIDES) as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-10 flex-1 rounded-[10px] text-[14px] font-semibold transition ${
              tab === t ? "bg-dusk-2 text-moon" : "text-haze"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <ol className="mt-5 flex flex-col gap-4" role="tabpanel">
        {GUIDES[tab].map((step, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-[1.55]">
            <span className="font-pixel tabular mt-0.5 w-5 shrink-0 text-spark">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-[13px] text-haze">
        앱 버전에 따라 메뉴 이름이 조금 다를 수 있어요. 대화가 길면 파일이 여러 개로 나뉘는데, 전부 한 번에 올리면 돼요.
      </p>
    </div>
  );
}
