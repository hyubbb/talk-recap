"use client";

import { useEffect, useState } from "react";
import type { SavedReport } from "@/lib/report/storage";
import { bestMood, laughRanking, lonelyRanking } from "@/lib/kakao/fun";
import { ghostRanking, summonRanking, waitLabel } from "@/lib/kakao/records";
import { replayScene, topOrigin, topResponders, type Slide } from "@/lib/story/slides";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Big, Count, Hero, Line, clock, delay, md, n } from "./parts";

const SPARK = "#ffc53d";

/** 코드로 센 분석 장(유행어 원조·여는/끄는 사람·웃음 버튼·허공·잠수·랠리·텔레파시·분위기 메이커·답장 관계·부르면 출동·명장면 다시 보기) */
export function FunSlide({ slide, saved, ink }: { slide: Slide; saved: SavedReport; ink: string }) {
  const { stats, members } = saved;
  const fun = stats.fun;
  const rec = stats.records;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "누군가";
  const colorOf = (id: string) => members.find((m) => m.id === id)?.color ?? SPARK;
  const pct = (r: number) => Math.round(r * 100);

  switch (slide.kind) {
    case "origin": {
      const o = fun && topOrigin(fun);
      if (!o) return null;
      const [first, ...rest] = o.spread;
      return (
        <>
          <p className="font-pixel text-[15px]">유행어 원조</p>
          <Hero ink={ink}>
            <p className="text-[clamp(30px,10cqw,44px)] leading-[1.15] font-black">&lsquo;{o.text}&rsquo;</p>
            <Line>
              원조는 <b>{nameOf(first.memberId)}</b>, {md(first.ts)}에 처음 썼어요
            </Line>
          </Hero>
          <ol className="flex flex-col gap-2" aria-label="퍼진 순서">
            {o.spread.map((s, i) => (
              <li key={s.memberId} className="bubble-in flex items-center gap-3 text-[16px]" style={delay(i, 450)}>
                <span className="font-pixel tabular w-9 shrink-0 text-center whitespace-nowrap">{i === 0 ? "원조" : `+${i}`}</span>
                <span className="size-3 shrink-0 rounded-full" style={{ background: colorOf(s.memberId), boxShadow: `0 0 0 2px ${ink}33` }} />
                <span className="flex-1 font-semibold">{nameOf(s.memberId)}</span>
                <span className="tabular text-[13px] opacity-75">
                  {md(s.ts)} · {n(s.count)}번
                </span>
              </li>
            ))}
          </ol>
          {rest.length > 0 && <p className="mt-3 text-[13px] opacity-70">처음 쓴 날 순서예요. 이렇게 옮았어요</p>}
        </>
      );
    }
    case "duty": {
      const opener = [...stats.members].sort((a, b) => b.firstOfDay - a.firstOfDay)[0];
      const closer = [...stats.members].sort((a, b) => b.lastWord - a.lastWord)[0];
      return (
        <>
          <p className="font-pixel text-[15px]">여는 사람, 끄는 사람</p>
          <div className="my-auto flex flex-col gap-10">
            <div className="bubble-in" style={delay(0)}>
              <p className="text-[15px] font-semibold opacity-75">하루의 첫 마디 담당</p>
              <p className="mt-1 text-[clamp(30px,10cqw,44px)] leading-[1.1] font-black">{nameOf(opener.id)}</p>
              <p className="tabular mt-1 text-[17px] font-semibold">
                <Count to={opener.firstOfDay} />일 동안 방을 깨웠어요
              </p>
            </div>
            <div className="bubble-in text-right" style={delay(1, 600)}>
              <p className="text-[15px] font-semibold opacity-75">대화 불 끄는 담당</p>
              <p className="mt-1 text-[clamp(30px,10cqw,44px)] leading-[1.1] font-black">{nameOf(closer.id)}</p>
              <p className="tabular mt-1 text-[17px] font-semibold">
                이 사람 말 뒤로 <Count to={closer.lastWord} />번 조용해졌어요
              </p>
            </div>
          </div>
          <p className="text-[12px] opacity-70">말한 뒤 3시간 넘게 아무도 말하지 않으면 &lsquo;불 끈&rsquo; 걸로 셌어요</p>
        </>
      );
    }
    case "laugh": {
      const list = fun ? laughRanking(fun) : [];
      const top = list[0];
      if (!top) return null;
      const ll = fun!.laughLength;
      const grew = ll.length >= 2 && ll[ll.length - 1].avg - ll[0].avg >= 0.5;
      const ks = (avg: number) => "ㅋ".repeat(Math.min(12, Math.max(2, Math.round(avg))));
      return (
        <>
          <p className="font-pixel text-[15px]">웃음 버튼</p>
          <Hero ink={ink}>
            <p className="text-[28px] font-extrabold">{nameOf(top.memberId)}</p>
            <Big>
              <Count to={pct(top.ratio)} />%
            </Big>
            <Line>이 사람이 말하면 1분 안에 ㅋㅋ가 터질 확률</Line>
          </Hero>
          <ul className="flex flex-col gap-2">
            {list.slice(0, 4).map((l, i) => (
              <li key={l.memberId} className="flex items-center gap-3 text-[15px]">
                <span className="w-[5.5em] truncate font-semibold">{nameOf(l.memberId)}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full" style={{ background: `${ink}22` }}>
                  <span className="bar-grow-x block h-full rounded-full" style={{ width: `${pct(l.ratio)}%`, background: i === 0 ? ink : `${ink}66`, ...delay(i, 120, 500) }} />
                </span>
                <span className="tabular w-10 text-right">{pct(l.ratio)}%</span>
              </li>
            ))}
          </ul>
          {grew && (
            <div className="mt-5 rounded-[14px] p-3" style={{ background: `${ink}14` }}>
              <p className="text-[13px] font-semibold opacity-75">ㅋ 인플레이션</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[15px] font-bold">
                <span>{ks(ll[0].avg)}</span>
                <span className="opacity-60">→</span>
                <span className="bubble-in" style={delay(0, 0, 900)}>{ks(ll[ll.length - 1].avg)}</span>
              </p>
              <p className="tabular mt-1 text-[12px] opacity-70">
                {Number(ll[0].month.slice(5))}월 평균 {ll[0].avg.toFixed(1)}개 → {Number(ll[ll.length - 1].month.slice(5))}월 {ll[ll.length - 1].avg.toFixed(1)}개. 친해졌다는 뜻이에요
              </p>
            </div>
          )}
        </>
      );
    }
    case "lonely": {
      const top = fun ? lonelyRanking(fun)[0] : undefined;
      const q = fun?.loneliest;
      return (
        <>
          <p className="font-pixel text-[15px]">허공에 외친 말</p>
          <Hero ink={ink}>
            {top ? (
              <>
                <p className="text-[28px] font-extrabold">{nameOf(top.memberId)}</p>
                <Big>
                  <Count to={pct(top.ratio)} />%
                </Big>
                <Line>말이 끝나고 30분 넘게 아무도 안 받았어요</Line>
              </>
            ) : (
              <Line>가장 오래 답이 없던 질문</Line>
            )}
          </Hero>
          {q && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold opacity-75">가장 오래 답이 없던 질문 · {nameOf(q.memberId)}</p>
              <span className="bubble-in self-start max-w-[85%] rounded-[18px] rounded-bl-[4px] px-3.5 py-2 text-[16px] font-semibold" style={{ background: `${ink}22`, ...delay(0, 0, 400) }}>
                {q.text}
              </span>
              <p className="bubble-in tabular text-[13px] opacity-70" style={delay(0, 0, 1300)}>
                {md(q.ts)} {clock(q.ts)} · 다음 말까지 {q.minutes >= 60 ? `${Math.floor(q.minutes / 60)}시간 ${q.minutes % 60}분` : `${q.minutes}분`}
              </p>
            </div>
          )}
        </>
      );
    }
    case "rally": {
      const r = fun?.rally;
      if (!r) return null;
      return (
        <>
          <p className="font-pixel text-[15px]">핑퐁 랠리</p>
          <Hero ink={ink}>
            <p className="text-[26px] font-extrabold">
              {nameOf(r.a)} ↔ {nameOf(r.b)}
            </p>
            <Big>
              <Count to={r.turns} ms={1400} />턴
            </Big>
            <Line>
              {md(r.ts)} {clock(r.ts)}부터 {r.minutes}분 동안 둘이서만 쉬지 않고 주고받았어요
            </Line>
          </Hero>
          <div className="relative h-10" aria-hidden>
            <span className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2" style={{ background: `${ink}33` }} />
            <span className="absolute top-1/2 left-0 size-3 -translate-y-1/2 rounded-full" style={{ background: colorOf(r.a) }} />
            <span className="absolute top-1/2 right-0 size-3 -translate-y-1/2 rounded-full" style={{ background: colorOf(r.b) }} />
            <span className="pingpong absolute top-1/2 size-4 -translate-y-1/2 rounded-full" style={{ background: ink }} />
          </div>
          <p className="mt-1 flex justify-between text-[13px] font-semibold opacity-80">
            <span>{nameOf(r.a)}</span>
            <span>{nameOf(r.b)}</span>
          </p>
        </>
      );
    }
    case "mood": {
      const m = fun && bestMood(fun);
      if (!m) return null;
      const max = Math.max(m.withAvg, m.withoutAvg);
      return (
        <>
          <p className="font-pixel text-[15px]">분위기 메이커</p>
          <Hero ink={ink}>
            <p className="text-[28px] font-extrabold">{nameOf(m.memberId)}</p>
            <Big>
              <Count to={m.times} digits={1} />배
            </Big>
            <Line>이 사람이 말한 날, 방이 이만큼 더 시끄러웠어요</Line>
          </Hero>
          <ul className="flex flex-col gap-3 text-[14px]">
            {[
              { label: "말한 날 하루 평균", v: m.withAvg, c: ink },
              { label: "조용한 날 하루 평균", v: m.withoutAvg, c: `${ink}55` },
            ].map((row, i) => (
              <li key={row.label}>
                <p className="flex justify-between font-semibold">
                  <span>{row.label}</span>
                  <span className="tabular">{Math.round(row.v)}개</span>
                </p>
                <span className="mt-1 block h-3 overflow-hidden rounded-full" style={{ background: `${ink}1a` }}>
                  <span className="bar-grow-x block h-full rounded-full" style={{ width: `${(row.v / max) * 100}%`, background: row.c, ...delay(i, 250, 500) }} />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] opacity-70">같이 있을 때 더 시끄러웠다는 뜻이고, 원인까지는 몰라요</p>
        </>
      );
    }
    case "relations": {
      const list = topResponders(stats).slice(0, 6);
      return (
        <>
          <p className="font-pixel text-[15px]">누가 누구 말을 받나</p>
          <Hero ink={ink}>
            <p className="text-[clamp(28px,9cqw,40px)] leading-[1.2] font-black">
              이 사람 말엔
              <br />이 사람이 먼저
            </p>
          </Hero>
          <ul className="flex flex-col gap-2.5">
            {list.map((r, i) => (
              <li key={r.from} className="bubble-in flex items-center gap-2 text-[16px]" style={delay(i, 220)}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(r.from) }} />
                <span className="w-[5.5em] truncate font-semibold">{nameOf(r.from)}</span>
                <span className="opacity-60">→</span>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(r.to) }} />
                <span className="flex-1 truncate font-extrabold">{nameOf(r.to)}</span>
                <span className="tabular text-[13px] opacity-75">{n(r.count)}번</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] opacity-70">말이 끝나고 10분 안에 바로 이어 말한 횟수예요</p>
        </>
      );
    }
    case "ghost": {
      const g = rec ? ghostRanking(rec)[0] : undefined;
      if (!g) return null;
      return (
        <>
          <p className="font-pixel text-[15px]">잠수 기록</p>
          <Hero ink={ink}>
            <p className="text-[28px] font-extrabold">{nameOf(g.memberId)}</p>
            <Big>
              <Count to={g.days} />일
            </Big>
            <Line>
              {md(g.from)}부터 {md(g.to)}까지 조용했고, 그동안 메시지 {n(g.missed)}개가 쌓였어요
            </Line>
          </Hero>
          {g.text && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold opacity-75">돌아와서 친 첫마디</p>
              <span className="bubble-in max-w-[85%] self-start rounded-[18px] rounded-bl-[4px] px-3.5 py-2 text-[16px] font-semibold" style={{ background: `${ink}22`, ...delay(0, 0, 700) }}>
                {g.text}
              </span>
            </div>
          )}
        </>
      );
    }
    case "jinx": {
      const j = rec?.jinx;
      if (!j) return null;
      return (
        <>
          <p className="font-pixel text-[15px]">텔레파시</p>
          <Hero ink={ink}>
            <p className="text-[26px] font-extrabold">
              {nameOf(j.a)} ↔ {nameOf(j.b)}
            </p>
            <Big>
              <Count to={j.count} />번
            </Big>
            <Line>1분 안에 똑같은 말을 쳤어요</Line>
          </Hero>
          {j.text && (
            <div className="flex flex-col gap-2" aria-hidden>
              <span className="bubble-in max-w-[85%] self-start rounded-[18px] rounded-bl-[4px] px-3.5 py-2 text-[16px] font-semibold" style={{ background: `${ink}22`, ...delay(0, 0, 400) }}>
                {j.text}
              </span>
              <span className="bubble-in max-w-[85%] self-end rounded-[18px] rounded-br-[4px] px-3.5 py-2 text-[16px] font-semibold" style={{ background: `${ink}22`, ...delay(0, 0, 900) }}>
                {j.text}
              </span>
            </div>
          )}
        </>
      );
    }
    case "summon": {
      const list = rec ? summonRanking(rec) : [];
      const top = list[0];
      if (!top) return null;
      return (
        <>
          <p className="font-pixel text-[15px]">부르면 출동</p>
          <Hero ink={ink}>
            <p className="text-[28px] font-extrabold">{nameOf(top.memberId)}</p>
            <Big>{waitLabel(top.median)}</Big>
            <Line>이름이 불리면 보통 이만큼 만에 나타나요</Line>
          </Hero>
          <ul className="flex flex-col gap-2">
            {list.slice(0, 5).map((s, i) => (
              <li key={s.memberId} className="bubble-in flex items-center gap-3 text-[15px]" style={delay(i, 180)}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(s.memberId) }} />
                <span className="flex-1 truncate font-semibold">{nameOf(s.memberId)}</span>
                <span className="tabular">{waitLabel(s.median)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] opacity-70">이름·별명이 불린 뒤 6시간 안에 말한 때의 중간값이에요</p>
        </>
      );
    }
    case "replay": {
      const r = replayScene(saved);
      if (!r) return null;
      return <Replay title={r.block.title} lines={r.context.lines} focus={r.context.focus} ink={ink} colorOfName={(name) => members.find((m) => m.name === name)?.color ?? SPARK} />;
    }
    default:
      return null;
  }
}

/** 명장면을 실제 카톡처럼 한 줄씩 다시 보여준다 ("입력 중…" 다음에 말풍선) */
function Replay({
  title,
  lines,
  focus,
  ink,
  colorOfName,
}: {
  title: string;
  lines: { date: string; time: string; who: string; text: string }[];
  focus: number;
  ink: string;
  colorOfName: (name: string) => string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setShown((v) => (v >= lines.length ? v : v + 1)), 1100);
    return () => clearInterval(t);
  }, [reduced, lines.length, round]);
  const count = reduced ? lines.length : shown;
  const first = lines[0]?.who;
  const typing = count < lines.length ? lines[count] : null;

  return (
    <>
      <p className="font-pixel text-[15px]">명장면 다시 보기</p>
      <p className="mt-2 text-[clamp(24px,8cqw,32px)] leading-[1.2] font-black">{title}</p>
      <p className="tabular mt-1 text-[13px] opacity-70">
        {lines[0]?.date} {lines[0]?.time}
      </p>
      <div className="my-auto flex flex-col gap-2 py-4" aria-live="polite">
        {lines.slice(0, count).map((l, i) => {
          const right = l.who !== first;
          return (
            <div key={i} className={`bubble-in flex flex-col ${right ? "items-end" : "items-start"}`}>
              <span className="mb-0.5 flex items-center gap-1 text-[12px] font-semibold opacity-80">
                <span className="size-2 rounded-full" style={{ background: colorOfName(l.who) }} />
                {l.who}
              </span>
              <span
                className={`max-w-[85%] px-3.5 py-2 text-[16px] leading-[1.4] font-semibold ${right ? "rounded-[18px] rounded-br-[4px]" : "rounded-[18px] rounded-bl-[4px]"}`}
                style={i === focus ? { background: SPARK, color: "#17142e" } : { background: `${ink}22` }}
              >
                {l.text}
              </span>
            </div>
          );
        })}
        {typing && (
          <div className={`flex ${typing.who !== first ? "justify-end" : "justify-start"}`} aria-hidden>
            <span className="flex gap-1 rounded-[18px] px-3.5 py-3" style={{ background: `${ink}1a` }}>
              {[0, 1, 2].map((d) => (
                <span key={d} className="typing-dot size-1.5 rounded-full" style={{ background: ink, animationDelay: `${d * 150}ms` }} />
              ))}
            </span>
          </div>
        )}
      </div>
      {!reduced && count >= lines.length && (
        <button
          type="button"
          data-no-capture
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={() => {
            setShown(0);
            setRound((v) => v + 1);
          }}
          className="cursor-pointer self-center rounded-full border border-current px-4 py-1.5 text-[13px] font-bold"
        >
          다시 재생
        </button>
      )}
    </>
  );
}
