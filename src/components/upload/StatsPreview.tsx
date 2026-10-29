"use client";

import { useAtomValue } from "jotai";
import { chunksAtom, peopleAtom, statsAtom } from "@/state/upload";
import { memberColor } from "@/lib/ui/colors";

const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};

export function StatsPreview() {
  const stats = useAtomValue(statsAtom);
  const people = useAtomValue(peopleAtom);
  const chunks = useAtomValue(chunksAtom);
  if (!stats) return null;

  const who = new Map(people.map((p, i) => [p.id, { name: p.displayName, color: memberColor(i) }]));
  const top = stats.members[0];
  const maxHour = Math.max(1, ...stats.members.flatMap((m) => m.hours));
  const h = stats.hidden;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--radius-card)] bg-dusk p-5">
        <p className="text-[14px] text-haze">
          {fmtDate(stats.start)} ~ {fmtDate(stats.end)}
        </p>
        <p className="tabular mt-1 text-[40px] leading-none font-black tracking-[-0.04em]">
          {stats.days}일, {stats.totalMessages.toLocaleString()}개
        </p>
        <p className="mt-2 text-[14px] text-haze">
          멤버 {stats.members.length}명 · AI 분석 구간 {chunks.length}개
        </p>
      </div>

      <section className="rounded-[var(--radius-card)] bg-dusk p-5">
        <h3 className="text-[17px] font-bold">수다 랭킹</h3>
        <ul className="mt-4 flex flex-col gap-3">
          {stats.members.map((m, i) => {
            const w = who.get(m.id);
            return (
              <li key={m.id}>
                <div className="flex items-baseline justify-between text-[14px]">
                  <span>
                    <span className="font-pixel mr-2 text-haze">{i + 1}</span>
                    {w?.name}
                  </span>
                  <span className="tabular text-haze">
                    {m.messages.toLocaleString()} · {(m.share * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 rounded-full bg-dusk-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(m.messages / top.messages) * 100}%`, background: w?.color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] bg-dusk p-5">
        <h3 className="text-[17px] font-bold">말버릇</h3>
        <ul className="mt-3 flex flex-col gap-2.5">
          {stats.members.map((m) => (
            <li key={m.id} className="flex items-start gap-3 text-[14px]">
              <span className="w-16 shrink-0 truncate font-semibold" style={{ color: who.get(m.id)?.color }}>
                {who.get(m.id)?.name.split(/\s+/).at(-1)}
              </span>
              <span className="flex flex-wrap gap-1.5">
                {m.catchphrases.slice(0, 4).map((c) => (
                  <span key={c.text} className="rounded-full bg-dusk-2 px-2.5 py-0.5">
                    {c.text} <span className="tabular text-haze">{c.count}</span>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] bg-dusk p-5">
        <h3 className="text-[17px] font-bold">누가 몇 시에 살아나나</h3>
        <div className="mt-4 flex flex-col gap-1.5">
          {stats.members.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-16 shrink-0 truncate text-[13px]">{who.get(m.id)?.name.split(/\s+/).at(-1)}</span>
              <div className="grid flex-1 grid-cols-24 gap-[2px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                {m.hours.map((c, hr) => (
                  <span
                    key={hr}
                    title={`${hr}시 ${c}개`}
                    className="aspect-square rounded-[3px]"
                    style={{ background: who.get(m.id)?.color, opacity: 0.08 + (c / maxHour) * 0.92 }}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2 pl-[72px] text-[11px] text-haze">
            <span className="flex-1">0시</span>
            <span className="flex-1 text-center">12시</span>
            <span className="flex-1 text-right">23시</span>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] bg-dusk p-5">
        <h3 className="text-[17px] font-bold">숨은 기록</h3>
        <ul className="mt-3 flex flex-col gap-2 text-[14px] leading-[1.55]">
          {h.longestMessage && (
            <li>
              가장 긴 메시지: <b>{who.get(h.longestMessage.memberId)?.name}</b>, {h.longestMessage.length.toLocaleString()}자
            </li>
          )}
          {h.repeatStreak && (
            <li>
              같은 말 연속 최고 기록: <b>{who.get(h.repeatStreak.memberId)?.name}</b>, &lsquo;{h.repeatStreak.text}&rsquo; {h.repeatStreak.count}번
            </li>
          )}
          {h.lateNightMonologue && (
            <li>
              새벽 혼잣말: <b>{who.get(h.lateNightMonologue.memberId)?.name}</b>, {h.lateNightMonologue.count}개 연속
            </li>
          )}
          {h.topLastWord && (
            <li>
              대화를 끝내는 사람: <b>{who.get(h.topLastWord.memberId)?.name}</b>, {h.topLastWord.count}번
            </li>
          )}
          {stats.busiestDay && (
            <li>
              가장 시끄러웠던 날: {stats.busiestDay.date.replaceAll("-", ".")}, {stats.busiestDay.count.toLocaleString()}개
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
