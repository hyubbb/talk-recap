"use client";

import { useAtom, useAtomValue } from "jotai";
import { chunksAtom, metaAtom, rangeAtom, rangeCountAtom } from "@/state/upload";
import type { DateRange } from "@/workers/protocol";
import { spanDays } from "@/lib/legal/business";

const DAY = 86_400_000;
const toInput = (ts: number) => new Date(ts).toISOString().slice(0, 10);
const dayStart = (ts: number) => Math.floor(ts / DAY) * DAY;
const fmt = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};

// 빠른 선택 (요금제 기간과 같은 단위). 요금은 분석 시작을 누를 때 따로 보여준다
const PRESETS = [
  { label: "최근 100일", days: 100 },
  { label: "최근 1년", days: 365 },
];

/** 올린 대화 중 분석할 기간을 고른다. 바꿀 때마다 onChange로 통계를 다시 낸다. */
export function RangePicker({ onChange }: { onChange: (range: DateRange | null) => void }) {
  const meta = useAtomValue(metaAtom);
  const [range, setRange] = useAtom(rangeAtom);
  const rangeCount = useAtomValue(rangeCountAtom);
  const chunks = useAtomValue(chunksAtom);
  if (!meta) return null;

  const first = dayStart(meta.firstTs);
  const last = dayStart(meta.lastTs) + DAY - 1;
  const totalDays = Math.round((last + 1 - first) / DAY);
  const cur = range ?? { from: first, to: last };
  const curDays = spanDays(cur.from, cur.to);

  const apply = (next: DateRange | null) => {
    const full = !next || (next.from <= first && next.to >= last);
    const value = full ? null : next;
    setRange(value);
    onChange(value);
  };

  const preset = (days: number) => apply({ from: Math.max(first, dayStart(last) - (days - 1) * DAY), to: last });
  // 대화가 프리셋보다 짧으면 그 프리셋은 '전체'와 같다
  const isPreset = (days: number) =>
    days >= totalDays ? range === null : range !== null && range.to === last && range.from === dayStart(last) - (days - 1) * DAY;

  return (
    <div className="rounded-[var(--radius-card)] bg-dusk p-5">
      <p className="text-[14px] text-haze">
        올린 대화: {fmt(first)} ~ {fmt(last)} ({totalDays.toLocaleString()}일, 메시지 {meta.messageCount.toLocaleString()}개)
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="빠른 기간 선택">
        {/* 대화가 100일 이하면 최근 1년은 최근 100일과 같으므로 숨긴다 */}
        {PRESETS.filter((p, i) => i === 0 || totalDays > PRESETS[i - 1].days).map((p) => (
          <Chip key={p.days} active={isPreset(p.days)} onClick={() => preset(p.days)}>
            {p.label}
          </Chip>
        ))}
        {totalDays > 100 && (
          <Chip active={range === null && !PRESETS.some((p) => p.days >= totalDays)} onClick={() => apply(null)}>
            전체
          </Chip>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <label className="flex flex-col gap-1 text-[12px] text-haze">
          시작일
          <input
            type="date"
            value={toInput(cur.from)}
            min={toInput(first)}
            max={toInput(cur.to)}
            onChange={(e) => e.target.value && apply({ from: Date.parse(e.target.value), to: cur.to })}
            className="h-11 rounded-[12px] bg-dusk-2 px-3 text-[15px] text-moon [color-scheme:dark]"
          />
        </label>
        <span className="mt-5 text-haze">~</span>
        <label className="flex flex-col gap-1 text-[12px] text-haze">
          종료일
          <input
            type="date"
            value={toInput(cur.to)}
            min={toInput(cur.from)}
            max={toInput(last)}
            onChange={(e) => e.target.value && apply({ from: cur.from, to: Date.parse(e.target.value) + DAY - 1 })}
            className="h-11 rounded-[12px] bg-dusk-2 px-3 text-[15px] text-moon [color-scheme:dark]"
          />
        </label>
      </div>

      <p className="mt-4 text-[14px]" aria-live="polite">
        분석할 기간: <b className="tabular">{curDays.toLocaleString()}일</b>, 메시지{" "}
        <b className="tabular">{(rangeCount ?? meta.messageCount).toLocaleString()}개</b>
        <span className="text-haze"> · AI 분석 구간 {chunks.length}개</span>
      </p>
      {chunks.length > 20 && (
        <p className="mt-1 text-[13px] text-haze">
          기간이 길면 분석이 오래 걸려요. 기념일에 맞춰 100일이나 1년 단위로 잘라 보는 걸 추천해요.
        </p>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 rounded-full px-4 text-[14px] font-semibold transition ${
        active ? "bg-spark text-spark-ink" : "bg-dusk-2 text-haze"
      }`}
    >
      {children}
    </button>
  );
}
