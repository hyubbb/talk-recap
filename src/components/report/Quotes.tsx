"use client";

import { createContext, useContext, useId, useState } from "react";
import type { Quote } from "@/lib/llm/schema";
import { quoteKey, type ContextBlock, type ContextMap } from "@/lib/report/context";

/** 결과에 저장된 근거 문맥. 예전 결과나 문맥을 못 찾은 인용은 아이콘이 안 보인다 */
const ContextsCtx = createContext<ContextMap>({});
export const ContextsProvider = ContextsCtx.Provider;
const useContextFor = (q: Quote) => useContext(ContextsCtx)[quoteKey(q)];

/** 앞뒤 대화 5줄. 인용 자신은 강조 */
export function ContextView({ block, id }: { block: ContextBlock; id?: string }) {
  return (
    <ol id={id} className="mt-2 flex flex-col gap-1 rounded-[12px] bg-night/70 p-3 text-[13px] leading-[1.5]">
      {block.lines.map((l, i) => (
        <li key={i} className={i === block.focus ? "text-moon" : "text-haze"}>
          <span className="tabular mr-1.5 text-[11px] opacity-70">
            {l.date !== block.lines[block.focus].date && `${l.date} `}
            {l.time}
          </span>
          <span className={`mr-1.5 font-semibold ${i === block.focus ? "text-spark" : ""}`}>{l.who}</span>
          <span className="whitespace-pre-wrap">{l.text}</span>
        </li>
      ))}
    </ol>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3.5h10a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1H7l-3 2.5V11H3a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M5 6.5h6M5 8.5h4" strokeLinecap="round" />
    </svg>
  );
}

/** 인용 한 줄 + 오른쪽 끝 작은 아이콘(누르면 앞뒤 2줄씩 펼침) */
export function QuoteLine({ q, showWho = false }: { q: Quote; showWho?: boolean }) {
  const block = useContextFor(q);
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="text-[14px] leading-[1.55]">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1">
          <span className="tabular mr-2 text-[12px] text-haze">{q.date}</span>
          {showWho && <span className="mr-1.5 text-[13px] font-semibold text-haze">{q.who}</span>}
          &ldquo;{q.text}&rdquo;
        </p>
        {block && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={id}
            aria-label={open ? "앞뒤 대화 닫기" : "앞뒤 대화 보기"}
            title="앞뒤 대화 보기"
            className={`-my-0.5 grid size-7 shrink-0 place-items-center rounded-full transition ${open ? "bg-spark text-spark-ink" : "text-haze hover:bg-dusk hover:text-moon"}`}
          >
            <ChatIcon />
          </button>
        )}
      </div>
      {block && open && <ContextView block={block} id={id} />}
    </li>
  );
}

export function QuoteList({ quotes, showWho = false }: { quotes: Quote[]; showWho?: boolean }) {
  if (!quotes.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {quotes.map((q, i) => (
        <QuoteLine key={`${i}-${q.text}`} q={q} showWho={showWho} />
      ))}
    </ul>
  );
}
