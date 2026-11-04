"use client";

import type { RoomStats } from "@/lib/kakao/stats";
import type { FunStats } from "@/lib/kakao/fun";
import { topOrigin, topResponders } from "@/lib/story/slides";
import { isSensitive } from "@/lib/quiz/sensitive";
import { clock, md, n } from "@/components/story/parts";
import { QuoteBubble, TileGrid, type Tile } from "./FunFacts";
import type { RecordStats } from "@/lib/kakao/records";

/**
 * 결과 페이지의 코드로 센 기록 (스토리에서만 보이던 숫자를 다시 볼 수 있게).
 * 전부 stats에서 읽고, 예전 결과에 없는 칸은 그리지 않는다.
 */
interface Who {
  nameOf: (id: string) => string;
  colorOf: (id: string) => string;
}

/** 예시로 보여도 되는 문장 (민감 주제·빈 글자 제외) */
const safeExample = (t: string) => /[\p{L}\p{N}]/u.test(t) && !isSensitive(t);

function Dot({ color }: { color: string }) {
  return <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />;
}

const HOUR_TICKS = [0, 6, 12, 18];

/** 시간대 히트맵: 방 전체 막대 + 멤버마다 24칸 (멤버별 최댓값 기준 진하기) */
export function HoursMap({ stats, nameOf, colorOf }: { stats: RoomStats } & Who) {
  let peak = 0;
  for (let h = 1; h < 24; h++) if (stats.hours[h] > stats.hours[peak]) peak = h;
  let max = 1;
  for (const v of stats.hours) if (v > max) max = v;
  const owl = [...stats.members].sort((a, b) => b.nightRatio - a.nightRatio)[0];
  return (
    <div className="rounded-[16px] bg-dusk p-4">
      <p className="font-pixel text-[12px] text-spark">방이 제일 시끄러운 시간</p>
      <p className="tabular mt-2 text-[30px] leading-[1.1] font-black tracking-[-0.03em]">{peak}시</p>
      <div className="mt-4 flex h-16 items-end gap-[2px]" aria-hidden>
        {stats.hours.map((v, h) => (
          <span
            key={h}
            className="flex-1 rounded-t-[2px]"
            style={h === peak ? { height: `${Math.max(4, (v / max) * 100)}%`, background: "var(--color-spark)" } : { height: `${Math.max(4, (v / max) * 100)}%`, background: "var(--color-haze)", opacity: 0.35 }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-1.5" aria-label="멤버별 활동 시간대">
        {stats.members.map((m) => {
          let top = 0;
          let mMax = 0;
          for (let h = 0; h < 24; h++) {
            if (m.hours[h] > m.hours[top]) top = h;
            if (m.hours[h] > mMax) mMax = m.hours[h];
          }
          return (
            <li key={m.id} className="flex items-center gap-2 text-[13px]">
              <span className="w-[4.5em] shrink-0 truncate font-semibold">{nameOf(m.id)}</span>
              <span className="flex flex-1 gap-[2px]" aria-hidden>
                {m.hours.map((v, h) => (
                  <span
                    key={h}
                    className="h-4 flex-1 rounded-[2px]"
                    style={{ background: colorOf(m.id), opacity: mMax ? 0.08 + (v / mMax) * 0.92 : 0.08 }}
                  />
                ))}
              </span>
              <span className="tabular w-8 shrink-0 text-right text-haze">{mMax ? `${top}시` : "-"}</span>
            </li>
          );
        })}
      </ul>
      <div className="tabular mt-1 flex gap-2 text-[11px] text-haze" aria-hidden>
        <span className="w-[4.5em] shrink-0" />
        <span className="relative h-3 flex-1">
          {HOUR_TICKS.map((h) => (
            <span key={h} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${((h + 0.5) / 24) * 100}%` }}>
              {h}
            </span>
          ))}
        </span>
        <span className="w-8 shrink-0" />
      </div>
      {owl && owl.nightRatio > 0 && (
        <p className="mt-3 text-[13px] text-haze">
          밤 10시~새벽 2시 담당: <b className="text-moon">{nameOf(owl.id)}</b> ({Math.round(owl.nightRatio * 100)}%)
        </p>
      )}
    </div>
  );
}

/** 하루의 첫 마디 담당 · 대화 불 끄는 담당 */
export function dutyTiles(stats: RoomStats): Tile[] {
  if (stats.members.length < 2) return [];
  const opener = [...stats.members].sort((a, b) => b.firstOfDay - a.firstOfDay)[0];
  const closer = [...stats.members].sort((a, b) => b.lastWord - a.lastWord)[0];
  const out: Tile[] = [];
  if (opener.firstOfDay > 0) {
    out.push({ key: "opener", label: "첫 마디 담당", value: `${n(opener.firstOfDay)}일`, caption: "그날 방을 처음 깨운 날", who: [opener.id] });
  }
  if (closer.lastWord > 0) {
    out.push({ key: "closer", label: "불 끄는 담당", value: `${n(closer.lastWord)}번`, caption: "이 사람 말 뒤로 3시간 넘게 조용해졌어요", who: [closer.id] });
  }
  return out;
}

/** 사람마다 그 사람 말을 제일 먼저(10분 안에) 받아주는 사람 */
export function Responders({ stats, nameOf, colorOf }: { stats: RoomStats } & Who) {
  const list = topResponders(stats);
  if (!list.length) return null;
  return (
    <div className="rounded-[16px] bg-dusk p-4">
      <ul className="flex flex-col gap-2.5">
        {list.map((r) => (
          <li key={r.from} className="flex items-center gap-2 text-[15px]">
            <Dot color={colorOf(r.from)} />
            <span className="w-[5.5em] truncate font-semibold">{nameOf(r.from)}</span>
            <span className="text-haze">→</span>
            <Dot color={colorOf(r.to)} />
            <span className="flex-1 truncate font-extrabold">{nameOf(r.to)}</span>
            <span className="tabular text-[13px] text-haze">{n(r.count)}번</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-haze">왼쪽 사람 말이 끝나고 10분 안에 오른쪽 사람이 바로 이어 말한 횟수예요</p>
    </div>
  );
}

/** 숨은 기록 타일 (대화를 끝낸 사람은 '불 끄는 담당'과 같아서 뺀다) */
export function hiddenTiles(stats: RoomStats, fun: FunStats | undefined): Tile[] {
  const h = stats.hidden;
  const out: Tile[] = [];
  if (h.longestMessage) {
    const preview = h.longestMessage.preview.trim();
    out.push({
      key: "longest", label: "가장 긴 메시지", value: `${n(h.longestMessage.length)}자`, caption: `${md(h.longestMessage.ts)}에 보낸 한 통`,
      who: [h.longestMessage.memberId], wide: true,
      extra: safeExample(preview) ? <QuoteBubble text={`${preview}…`} /> : undefined,
    });
  }
  if (h.lateNightMonologue) {
    const l = h.lateNightMonologue;
    out.push({
      key: "monologue", label: "새벽 독백", value: `${n(l.count)}개`, caption: `새벽 ${clock(l.ts)}부터 혼자 ${n(l.minutes)}분 동안`, who: [l.memberId],
    });
  }
  if (h.repeatStreak) {
    const r = h.repeatStreak;
    out.push({
      key: "repeat", label: "같은 말 연타", value: `${n(r.count)}연속`, caption: "같은 말을 쉬지 않고 이어 보냈어요", who: [r.memberId],
      extra: safeExample(r.text) ? <QuoteBubble text={r.text.trim()} /> : undefined,
    });
  }
  if (fun?.loneliest) {
    const q = fun.loneliest;
    const hours = q.minutes >= 120 ? `${Math.floor(q.minutes / 60)}시간` : `${n(q.minutes)}분`;
    out.push({
      key: "loneliest", label: "가장 오래 답이 없던 질문", value: hours, caption: `${md(q.ts)} ${clock(q.ts)}에 물어봤어요`, who: [q.memberId], wide: true,
      extra: safeExample(q.text) ? <QuoteBubble text={q.text} /> : undefined,
    });
  }
  return out;
}

/** 유행어가 퍼진 순서 (원조 → 옮은 사람들) */
export function OriginSpread({ fun, nameOf, colorOf }: { fun: FunStats } & Who) {
  const o = topOrigin(fun);
  if (!o) return null;
  return (
    <div className="rounded-[16px] bg-dusk p-4">
      <p className="font-pixel text-[12px] text-spark">&lsquo;{o.text}&rsquo; 전파 경로</p>
      <ol className="mt-3 flex flex-col gap-2">
        {o.spread.map((s, i) => (
          <li key={s.memberId} className="flex items-center gap-3 text-[15px]">
            <span className="font-pixel tabular w-9 shrink-0 text-center text-[12px] whitespace-nowrap text-haze">{i === 0 ? "원조" : `+${i}`}</span>
            <Dot color={colorOf(s.memberId)} />
            <span className="flex-1 truncate font-semibold">{nameOf(s.memberId)}</span>
            <span className="tabular text-[13px] text-haze">
              {md(s.ts)} · {n(s.count)}번
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[12px] text-haze">처음 쓴 날 순서예요</p>
    </div>
  );
}

/** 월별 ㅋ 길이 (ㅋㅋ가 들어간 말에서 가장 긴 ㅋ 줄기 평균) */
export function LaughChart({ fun }: { fun: FunStats }) {
  const ll = fun.laughLength;
  if (ll.length < 2) return null;
  let max = 1;
  for (const m of ll) if (m.avg > max) max = m.avg;
  let top = 0;
  for (let i = 1; i < ll.length; i++) if (ll[i].avg > ll[top].avg) top = i;
  // 달이 많으면 막대가 너무 가늘어서 최근 24달만
  const shown = ll.slice(-24);
  const offset = ll.length - shown.length;
  return (
    <div className="rounded-[16px] bg-dusk p-4">
      <p className="font-pixel text-[12px] text-spark">달마다 ㅋ 길이</p>
      <p className="tabular mt-2 text-[30px] leading-[1.1] font-black tracking-[-0.03em]">
        {ll[top].month.replace("-", ".")}
      </p>
      <p className="mt-1 text-[13px] text-haze">ㅋ를 제일 길게 친 달 (평균 {ll[top].avg.toFixed(1)}개)</p>
      <div className="mt-4 flex h-20 items-end gap-[3px]" aria-hidden>
        {shown.map((m, i) => (
          <span
            key={m.month}
            className="flex-1 rounded-t-[2px]"
            style={i + offset === top ? { height: `${Math.max(6, (m.avg / max) * 100)}%`, background: "var(--color-spark)" } : { height: `${Math.max(6, (m.avg / max) * 100)}%`, background: "var(--color-haze)", opacity: 0.35 }}
          />
        ))}
      </div>
      <div className="tabular mt-1 flex justify-between text-[11px] text-haze" aria-hidden>
        <span>{shown[0].month.replace("-", ".")}</span>
        <span>{shown[shown.length - 1].month.replace("-", ".")}</span>
      </div>
    </div>
  );
}

const DAY = 86_400_000;
const dayMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const dot = (date: string) => date.slice(2).replaceAll("-", ".");

/** 잔디 달력: 최근 53주, 세로는 일~토. 진하기는 대화한 날들 안에서 4단계 */
export function Calendar({ records, busiest }: { records: RecordStats; busiest: RoomStats["busiestDay"] }) {
  const { daily, streak } = records;
  if (daily.length < 2) return null;
  const counts = new Map(daily.map((d) => [d.date, d.count]));
  const end = dayMs(daily[daily.length - 1].date);
  const first = dayMs(daily[0].date);
  const start = first - new Date(first).getUTCDay() * DAY; // 그 주 일요일부터
  const sorted = daily.map((d) => d.count).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  const level = (c: number) => (c <= 0 ? 0 : c <= q1 ? 1 : c <= q2 ? 2 : c <= q3 ? 3 : 4);
  const OPACITY = [0, 0.3, 0.55, 0.8, 1];
  const cells: { date: string; count: number }[] = [];
  for (let t = start; t <= end; t += DAY) {
    const date = new Date(t).toISOString().slice(0, 10);
    cells.push({ date, count: t < first ? -1 : counts.get(date) ?? 0 });
  }
  const weeks = Math.ceil(cells.length / 7);
  const active = daily.length;
  const total = Math.round((end - first) / DAY) + 1;
  return (
    <div className="rounded-[16px] bg-dusk p-4">
      <p className="font-pixel text-[12px] text-spark">최장 연속 대화</p>
      <p className="tabular mt-2 text-[30px] leading-[1.1] font-black tracking-[-0.03em]">{streak ? `${n(streak.days)}일` : "-"}</p>
      {streak && streak.days > 1 && (
        <p className="tabular mt-1 text-[13px] text-haze">
          {dot(streak.from)} ~ {dot(streak.to)} 하루도 안 빼고 떠들었어요
        </p>
      )}
      <div
        className="mt-4 grid grid-flow-col grid-rows-7 gap-[3px]"
        style={{ gridAutoColumns: "minmax(0, 1fr)", maxWidth: weeks < 20 ? `${weeks * 26}px` : undefined }}
        role="img"
        aria-label={`최근 ${n(total)}일 중 ${n(active)}일 대화했어요`}
      >
        {cells.map((c) => (
          <span
            key={c.date}
            title={c.count >= 0 ? `${dot(c.date)} · ${n(c.count)}개` : undefined}
            className={`aspect-square rounded-[3px] ${c.date === busiest?.date ? "ring-2 ring-moon" : ""}`}
            style={
              c.count < 0
                ? { background: "transparent" }
                : level(c.count) === 0
                  ? { background: "var(--color-dusk-2)" }
                  : { background: "var(--color-spark)", opacity: OPACITY[level(c.count)] }
            }
          />
        ))}
      </div>
      <div className="tabular mt-1.5 flex justify-between text-[11px] text-haze" aria-hidden style={{ maxWidth: weeks < 20 ? `${weeks * 26}px` : undefined }}>
        <span>{dot(daily[0].date)}</span>
        <span>{dot(daily[daily.length - 1].date)}</span>
      </div>
      <p className="mt-3 text-[13px] text-haze">
        {n(total)}일 중 <b className="text-moon">{n(active)}일</b> 대화했어요
        {busiest && counts.has(busiest.date) && (
          <>
            {" · "}테두리는 가장 시끄러운 날({dot(busiest.date)}, {n(busiest.count)}개)
          </>
        )}
      </p>
    </div>
  );
}

export function RecordTiles({ tiles, nameOf, colorOf }: { tiles: Tile[] } & Who) {
  if (!tiles.length) return null;
  return <TileGrid tiles={tiles} nameOf={nameOf} colorOf={colorOf} />;
}
