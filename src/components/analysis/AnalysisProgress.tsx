"use client";

import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { analysisAtom, type ChunkRun } from "@/state/analysis";

const md = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};

const DOT: Record<ChunkRun["status"], string> = {
  waiting: "bg-dusk-2",
  running: "bg-spark animate-pulse",
  done: "bg-[#4ADE80]",
  failed: "bg-danger",
};

/** embedded: 오버레이 안에 넣을 때 카드 배경·여백을 뺀다 */
export function AnalysisProgress({ embedded = false }: { embedded?: boolean }) {
  const state = useAtomValue(analysisAtom);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (state.kind !== "running" && state.kind !== "error") return null;

  const chunks = state.chunks;
  const done = chunks.filter((c) => c.status === "done").length;
  const pct = chunks.length ? Math.round((done / chunks.length) * 100) : 0;
  const highlights = chunks.filter((c) => c.highlight).slice(-3);
  const elapsed = state.kind === "running" ? Math.round((now - state.startedAt) / 1000) : 0;

  return (
    <div className={embedded ? "" : "rounded-[var(--radius-card)] bg-dusk p-5"} role="status" aria-live="polite">
      <div className="flex items-baseline justify-between">
        <p className="text-[17px] font-bold">
          {state.kind === "error"
            ? embedded
              ? `완료된 구간 ${done}/${chunks.length}`
              : "분석이 멈췄어요"
            : state.stage === "synth"
              ? "구간 노트를 합치는 중"
              : `구간 분석 중 ${done}/${chunks.length}`}
        </p>
        {state.kind === "running" && <span className="tabular text-[13px] text-haze">{elapsed}초</span>}
      </div>

      <div className="mt-3 h-2.5 rounded-full bg-dusk-2">
        <div
          className="h-full rounded-full bg-spark transition-[width] duration-500"
          style={{ width: `${state.kind === "running" && state.stage === "synth" ? 100 : pct}%` }}
        />
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        {chunks.map((c) => (
          <li key={c.index} className="flex items-center gap-2">
            <span className={`size-2.5 shrink-0 rounded-full ${DOT[c.status]}`} aria-hidden />
            <span className="tabular text-haze">
              {md(c.start)}~{md(c.end)}
            </span>
            {c.status === "running" && c.tries > 1 && <span className="text-haze">재시도 {c.tries - 1}</span>}
            {c.status === "failed" && <span className="text-danger">실패</span>}
          </li>
        ))}
      </ul>

      {highlights.length > 0 && (
        <div className="mt-4 border-t border-dusk-2 pt-3">
          <p className="text-[12px] text-haze">방금 찾은 장면</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[14px]">
            {highlights.map((c) => (
              <li key={c.index} className="bubble-in">
                {c.highlight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.kind === "error" && <p className="mt-4 text-[14px] text-danger">{state.message}</p>}
    </div>
  );
}
