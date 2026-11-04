"use client";

import type { SavedReport } from "@/lib/report/storage";
import { ContextView, QuoteList } from "./Quotes";

/**
 * 우리 방 사전: 코드가 뽑은 이 방 말(유행어·말버릇)에 AI가 붙인 뜻풀이.
 * 쓴 횟수와 원조는 stats에서, 예문은 검증된 인용이 없으면 분석 때 뽑아 둔 말버릇 장면으로 보여준다.
 */
export function Dictionary({ saved }: { saved: SavedReport }) {
  const { report, stats, members } = saved;
  const entries = report.dictionary ?? [];
  if (!entries.length) return null;
  const member = (id: string) => members.find((m) => m.id === id);

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((e) => {
        const origin = stats.fun?.origins.find((o) => o.text === e.word);
        const first = origin ? member(origin.spread[0].memberId) : undefined;
        let count = 0;
        let users = 0;
        for (const m of stats.members) {
          const c = m.catchphrases.find((p) => p.text.trim() === e.word);
          if (c) {
            count += c.count;
            users++;
          }
        }
        const scene = e.quotes.length
          ? null
          : Object.values(saved.phrases ?? {})
              .flat()
              .find((p) => p.text.trim() === e.word && p.context)?.context;
        return (
          <li key={e.word} className="rounded-[var(--radius-card)] bg-dusk p-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-[22px] leading-[1.2] font-black tracking-[-0.02em]">{e.word}</p>
              {count > 0 && (
                <p className="tabular text-[13px] text-haze">
                  {users > 1 ? `${users}명이 ` : ""}
                  {count.toLocaleString()}번
                </p>
              )}
            </div>
            {first && (
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-haze">
                <span className="size-2 rounded-full" style={{ background: first.color }} />
                원조 <b className="text-moon">{first.name}</b>
              </p>
            )}
            <p className="mt-2 text-[15px] leading-[1.6]">
              <span className="font-pixel mr-1.5 text-[12px] text-spark">뜻</span>
              {e.meaning}
            </p>
            {e.quotes.length > 0 && (
              <div className="mt-3 rounded-[14px] bg-dusk-2 px-4 py-3">
                <QuoteList quotes={e.quotes} showWho />
              </div>
            )}
            {scene && <ContextView block={scene} />}
          </li>
        );
      })}
    </ul>
  );
}
