"use client";

import type { SavedReport } from "@/lib/report/storage";
import { safePair, type Slide } from "@/lib/story/slides";
import { isSensitive } from "@/lib/quiz/sensitive";
import { ItemIcon } from "@/components/bag/PixelIcon";
import { Big, Bubble, Count, Hero, Line, clean, clock, fmt, n } from "./parts";
import { FunSlide } from "./FunSlides";

/** 예시로 보여도 되는 문장 (민감 주제·빈 글자 제외) */
const safeExample = (t: string) => /[\p{L}\p{N}]/u.test(t) && !isSensitive(t);

export interface SlideActions {
  onReport: () => void;
  onQuiz?: () => void;
  onShare?: () => void;
  /** 샘플 맛보기 마지막 장 */
  onUpload?: () => void;
}

/** 한 장의 내용. 숫자는 stats에서, 해석은 report에서 */
export function SlideContent({ slide, saved, ink, actions, words }: { slide: Slide; saved: SavedReport; ink: string; actions: SlideActions; words: string[] }) {
  const { stats, report, members } = saved;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "누군가";
  const ranked = [...stats.members].sort((a, b) => b.messages - a.messages);

  switch (slide.kind) {
    case "origin":
    case "duty":
    case "laugh":
    case "lonely":
    case "rally":
    case "mood":
    case "relations":
    case "ghost":
    case "jinx":
    case "summon":
    case "replay":
      return <FunSlide slide={slide} saved={saved} ink={ink} />;
    case "opening":
      return (
        <>
          <p className="text-center text-[15px] opacity-80">
            {fmt(stats.start)} ~ {fmt(stats.end)}
          </p>
          <Hero words={words} ink={ink}>
            <p className="text-[clamp(30px,10cqw,44px)] leading-[1.15] font-black tracking-[-0.03em]">{report.title}</p>
          </Hero>
          <div className="text-center">
            <Big>
              <Count to={stats.days} />일
            </Big>
            <Line>
              메시지 <Count to={stats.totalMessages} ms={1400} />개를 같이 보냈어요
            </Line>
          </div>
        </>
      );
    case "ranking": {
      const top = ranked[0];
      return (
        <>
          <p className="font-pixel text-[15px]">수다왕</p>
          <Hero words={words} ink={ink}>
            <p className="text-[28px] font-extrabold">{top ? nameOf(top.id) : ""}</p>
            <Big>
              <Count to={top ? top.messages : 0} />개
            </Big>
            <Line>{top ? `혼자 전체의 ${Math.round(top.share * 100)}%를 말했어요` : ""}</Line>
          </Hero>
          <ol className="flex flex-col gap-2">
            {ranked.slice(0, 5).map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 text-[16px]">
                <span className="font-pixel tabular w-6">{i + 1}</span>
                <span className="flex-1 font-semibold">{nameOf(m.id)}</span>
                <span className="tabular opacity-80">{n(m.messages)}</span>
              </li>
            ))}
          </ol>
        </>
      );
    }
    case "catchphrase": {
      const best = stats.members
        .flatMap((m) => m.catchphrases.slice(0, 1).map((c) => ({ m, c })))
        .filter(({ c }) => !isSensitive(c.text))
        .sort((a, b) => b.c.count - a.c.count)[0];
      return (
        <>
          <p className="font-pixel text-[15px]">말버릇 왕</p>
          <Hero words={words} ink={ink}>
            {best ? (
              <>
                <p className="text-[28px] font-extrabold">&lsquo;{best.c.text.trim()}&rsquo;</p>
                <Big>
                  <Count to={best.c.count} />번
                </Big>
                <Line>{nameOf(best.m.id)}의 입버릇이에요</Line>
              </>
            ) : (
              <Line>아직 말버릇이 안 보여요</Line>
            )}
          </Hero>
        </>
      );
    }
    case "hours": {
      let peak = 0;
      for (let h = 1; h < 24; h++) if (stats.hours[h] > stats.hours[peak]) peak = h;
      const max = stats.hours.reduce((a, b) => (b > a ? b : a), 1);
      const owl = [...stats.members].sort((a, b) => b.nightRatio - a.nightRatio)[0];
      return (
        <>
          <p className="font-pixel text-[15px]">누가 밤에 살아나나</p>
          <Hero words={words} ink={ink}>
            <Big>{peak}시</Big>
            <Line>방이 제일 시끄러운 시간</Line>
          </Hero>
          <div aria-hidden>
            <div className="flex h-24 items-end gap-[2px]">
              {stats.hours.map((v, h) => (
                <span
                  key={h}
                  className="bar-grow flex-1 rounded-t-[2px]"
                  style={{ height: `${Math.max(4, (v / max) * 100)}%`, background: h === peak ? "#ffc53d" : `${ink}55`, animationDelay: `${200 + h * 35}ms` }}
                />
              ))}
            </div>
            <div className="tabular mt-1.5 flex gap-[2px] text-[clamp(8px,2.2cqw,11px)] leading-none">
              {stats.hours.map((_, h) => (
                <span key={h} className={`flex-1 text-center ${h === peak ? "font-bold" : "opacity-60"}`} style={h === peak ? { color: "#ffc53d" } : undefined}>
                  {h}
                </span>
              ))}
            </div>
            <p className="mt-1 text-right text-[11px] opacity-60">(시)</p>
          </div>
          {owl && owl.nightRatio > 0 && (
            <Line>
              밤 10시~새벽 2시 담당: {nameOf(owl.id)} ({Math.round(owl.nightRatio * 100)}%)
            </Line>
          )}
        </>
      );
    }
    case "hidden": {
      const h = stats.hidden;
      return (
        <>
          <p className="font-pixel text-[15px]">숨은 기록</p>
          <ul className="my-auto flex flex-col gap-5">
            {h.longestMessage && (
              <li>
                <p className="tabular text-[40px] leading-none font-black">{n(h.longestMessage.length)}자</p>
                <p className="mt-1 text-[15px] font-semibold">가장 긴 메시지 · {nameOf(h.longestMessage.memberId)}</p>
                {safeExample(h.longestMessage.preview) && (
                  <div className="mt-2 flex">
                    <Bubble text={`${h.longestMessage.preview.trim()}…`} ink={ink} />
                  </div>
                )}
              </li>
            )}
            {h.lateNightMonologue && (
              <li>
                <p className="tabular text-[40px] leading-none font-black">새벽 {clock(h.lateNightMonologue.ts)}</p>
                <p className="mt-1 text-[15px] font-semibold">
                  혼자 {n(h.lateNightMonologue.count)}개 보낸 새벽 독백 · {nameOf(h.lateNightMonologue.memberId)}
                </p>
              </li>
            )}
            {h.repeatStreak && (
              <li>
                <p className="tabular text-[40px] leading-none font-black">{n(h.repeatStreak.count)}연속</p>
                <p className="mt-1 text-[15px] font-semibold">같은 말 연타 · {nameOf(h.repeatStreak.memberId)}</p>
                {safeExample(h.repeatStreak.text) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from({ length: Math.min(3, h.repeatStreak.count) }, (_, i) => (
                      <Bubble key={i} text={h.repeatStreak!.text.trim()} ink={ink} faint={i > 0} />
                    ))}
                  </div>
                )}
              </li>
            )}
            {h.topLastWord && (
              <li>
                <p className="tabular text-[40px] leading-none font-black">{n(h.topLastWord.count)}번</p>
                <p className="mt-1 text-[15px] font-semibold">대화를 끝낸 사람 · {nameOf(h.topLastWord.memberId)}</p>
              </li>
            )}
          </ul>
        </>
      );
    }
    case "acts":
      return (
        <>
          <p className="font-pixel text-[15px]">줄거리</p>
          <Hero words={words} ink={ink}>
            <Big>{report.acts.length}막</Big>
            <Line>{clean(report.acts[0]?.title ?? "")}부터 시작해요</Line>
          </Hero>
          <ol className="flex flex-col gap-3">
            {report.acts.map((a, i) => (
              <li key={i}>
                <p className="text-[17px] font-bold">
                  <span className="font-pixel mr-2">{i + 1}막</span>
                  {clean(a.title)}
                </p>
                <p className="text-[13px] opacity-75">{a.period}</p>
              </li>
            ))}
          </ol>
        </>
      );
    case "member": {
      const m = report.members.find((x) => x.name === slide.member);
      const st = stats.members.find((x) => nameOf(x.id) === slide.member);
      if (!m) return null;
      return (
        <>
          <p className="font-pixel text-[15px]">아키타입</p>
          <Hero words={words} ink={ink}>
            <p className="text-[clamp(22px,7cqw,30px)] font-extrabold">{m.name}</p>
            <p className="mt-1 text-[clamp(32px,11cqw,46px)] leading-[1.12] font-black tracking-[-0.03em]">{m.archetype}</p>
            <Line>{m.oneLiner ? `“${m.oneLiner}”` : m.summary}</Line>
          </Hero>
          {st && <p className="tabular text-center text-[14px] opacity-80">메시지 {n(st.messages)}개 · 그날 첫 마디 {n(st.firstOfDay)}번</p>}
        </>
      );
    }
    case "pair": {
      const p = safePair(saved);
      if (!p) return null;
      return (
        <>
          <p className="font-pixel text-[15px]">최고 궁합</p>
          <Hero words={words} ink={ink}>
            <p className="text-[26px] font-extrabold">
              {p.a} × {p.b}
            </p>
            <Big>
              <Count to={p.score} />점
            </Big>
            <Line>{p.label}</Line>
          </Hero>
        </>
      );
    }
    case "mbti":
      return (
        <>
          <p className="font-pixel text-[15px]">MBTI</p>
          <Hero words={words} ink={ink}>
            <p className="text-[clamp(30px,10cqw,42px)] leading-[1.15] font-black">본인 주장<br />vs 행동 추론</p>
          </Hero>
          <ul className="flex flex-col gap-3">
            {report.members.map((m) => (
              <li key={m.name} className="flex items-baseline justify-between gap-3 text-[16px]">
                <span className="font-semibold">{m.name}</span>
                <span>
                  {m.mbti.claimed && m.mbti.claimed !== m.mbti.type && <s className="mr-2 opacity-60">{m.mbti.claimed}</s>}
                  <span className="font-pixel text-[22px]">{m.mbti.type}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] opacity-70">대화로 추론한 놀이용 결과예요</p>
        </>
      );
    case "awards":
      return (
        <>
          <p className="font-pixel text-[15px]">어워드</p>
          <Hero words={words} ink={ink}>
            <p className="font-pixel text-[15px] opacity-80">{clean(report.awards[0]?.title ?? "")}</p>
            <Big>{report.awards[0]?.winner ?? ""}</Big>
          </Hero>
          <ul className="flex flex-col gap-3">
            {report.awards.slice(1, 5).map((a) => (
              <li key={a.title}>
                <p className="font-pixel text-[13px] opacity-80">{clean(a.title)}</p>
                <p className="text-[20px] font-extrabold">{a.winner}</p>
                {a.quotes?.[0] && (
                  <p className="mt-0.5 line-clamp-1 text-[13px] opacity-80">&ldquo;{a.quotes[0].text}&rdquo;</p>
                )}
              </li>
            ))}
          </ul>
        </>
      );
    case "bag": {
      const m = report.members.find((x) => x.name === slide.member);
      if (!m) return null;
      return (
        <>
          <p className="font-pixel text-[15px]">WHAT&apos;S IN MY BAG</p>
          <Hero words={words} ink={ink}>
            <p className="text-[clamp(28px,9cqw,40px)] leading-[1.15] font-black">{m.name}의<br />{clean(m.bag.bag) || "가방"}</p>
          </Hero>
          <ul className="grid grid-cols-3 gap-3">
            {m.bag.items.slice(0, 6).map((it, i) => (
              <li key={i} className="flex flex-col items-center gap-1 text-center">
                <span className="rounded-[10px] bg-moon/90 p-1.5">
                  <ItemIcon item={it.item} size={44} />
                </span>
                <span className="font-pixel line-clamp-2 text-[11px]">{clean(it.item)}</span>
              </li>
            ))}
          </ul>
        </>
      );
    }
    case "teaser":
      return (
        <>
          <p className="font-pixel text-[15px]">샘플은 여기까지</p>
          <div className="my-auto">
            <p className="text-[30px] leading-[1.25] font-black tracking-[-0.03em]">
              우리 방이면
              <br />
              누가 나올까요?
            </p>
            <p className="mt-4 text-[16px] leading-[1.55] font-medium opacity-80">
              말버릇 왕, 명장면, 궁합, MBTI, 가방 속까지. 우리 방 친구들 이름으로 나와요.
            </p>
          </div>
          <div className="flex flex-col gap-2" data-no-capture onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            {actions.onUpload && (
              <button type="button" onClick={actions.onUpload} className="h-12 rounded-[14px] bg-night text-[16px] font-bold text-moon">
                내 대화로 분석하기
              </button>
            )}
            <button type="button" onClick={actions.onReport} className="h-12 rounded-[14px] border border-current text-[16px] font-bold">
              샘플 리포트 더 보기
            </button>
          </div>
        </>
      );
    case "closing":
      return (
        <>
          <p className="font-pixel text-[15px]">총평</p>
          <Hero words={words} ink={ink}>
            <p className="text-[22px] leading-[1.5] font-bold">{report.closing}</p>
          </Hero>
          <div className="flex flex-col gap-2" data-no-capture onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <button type="button" onClick={actions.onReport} className="h-12 rounded-[14px] bg-spark text-[16px] font-bold text-spark-ink">
              리포트 보기
            </button>
            {actions.onQuiz && (
              <button type="button" onClick={actions.onQuiz} className="h-12 rounded-[14px] bg-moon text-[16px] font-bold text-night">
                퀴즈 시작
              </button>
            )}
            {actions.onShare && (
              <button type="button" onClick={actions.onShare} className="h-12 rounded-[14px] border border-current text-[16px] font-bold">
                공유
              </button>
            )}
          </div>
        </>
      );
  }
}
