"use client";

import { useState } from "react";

/** 해석 못 한 줄이 많을 때: 문제 줄 3개(이름·내용 가림)를 복사해서 제보하게 한다 */
export function FormatReport({ samples, unparsed }: { samples: string[]; unparsed: number }) {
  const [copied, setCopied] = useState(false);
  const text = ["[톡방 Wrapped 형식 제보]", `해석 못 한 줄: ${unparsed}개`, ...samples.map((s, i) => `${i + 1}) ${s}`)].join("\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("아래 내용을 복사해 주세요", text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <section className="mt-4 rounded-[14px] bg-dusk p-4" aria-label="형식 제보">
      <p className="text-[15px] font-bold">처음 보는 형식이 섞여 있어요</p>
      <p className="mt-1 text-[14px] leading-[1.55] text-haze">
        읽지 못한 줄이 있어서 결과가 빠질 수 있어요. 아래 문제 줄을 복사해서 제보해 주시면 고칠게요. 이름과 내용은 가려져 있어요.
      </p>
      {samples.length > 0 && (
        <pre className="mt-3 overflow-x-auto rounded-[12px] bg-dusk-2 p-3 text-[12px] leading-[1.6] whitespace-pre-wrap text-haze">
          {samples.join("\n")}
        </pre>
      )}
      <button type="button" onClick={copy} className="mt-3 rounded-full bg-dusk-2 px-4 py-2 text-[14px] font-semibold">
        {copied ? "복사했어요" : "문제 줄 복사"}
      </button>
    </section>
  );
}
