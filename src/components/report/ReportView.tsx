"use client";

import Link from "next/link";
import type { SavedReport } from "@/lib/report/storage";
import type { Quote, StoryBlock } from "@/lib/llm/schema";
import type { PhraseSample } from "@/lib/report/context";
import { isSensitive } from "@/lib/quiz/sensitive";
import { ContextsProvider, ContextView, QuoteList } from "./Quotes";
import { initialOf } from "@/lib/ui/colors";
import { useRef, useState } from "react";
import { ObjectionSlot } from "@/components/objection/ObjectionSlot";
import { BagCard } from "@/components/bag/BagCard";
import { MemberCard } from "@/components/cards/MemberCard";
import { SaveImageButton } from "@/components/cards/SaveImageButton";
import { PastReportsMenu } from "./PastReportsMenu";
// [보류] 이미지 만들기 프롬프트 — 다시 켜려면 이 import와 아래 "이미지 만들기 프롬프트" 섹션 주석을 풀기 (docs/TASKS.md "보류 중인 기능")
// import { ImagePrompts } from "@/components/prompts/ImagePrompts";
import type { Report } from "@/lib/llm/schema";

const fmt = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};

interface Props {
  saved: SavedReport;
  /** 공유 링크(/s/[id])로 열었을 때 */
  shared?: { expiresAt: string };
  /** 결과 제목 아래에 붙는 영역 (공유 버튼 등) */
  actions?: React.ReactNode;
  /** 공유 링크에서 "나는 누구?"로 고른 이름 */
  me?: string | null;
}

export function ReportView({ saved, shared, actions }: Props) {
  const { report, stats, members } = saved;
  const byName = new Map(members.map((m) => [m.name, m]));
  const color = (name: string) => byName.get(name)?.color ?? "var(--color-haze)";
  const pairs = [...report.pairs].sort((a, b) => b.score - a.score);
  const isMock = saved.provider === "mock";
  const idOf = new Map(members.map((m) => [m.name, m.id]));
  // 말버릇: 분석 때 뽑은 장면이 있으면 그걸, 예전 결과면 통계의 말버릇만 (장면 없이)
  const phrasesOf = (name: string): PhraseSample[] => {
    const id = idOf.get(name);
    if (!id) return [];
    if (saved.phrases?.[id]) return saved.phrases[id];
    const st = stats.members.find((x) => x.id === id);
    return (st?.catchphrases ?? [])
      .filter((p) => !isSensitive(p.text))
      .slice(0, 4)
      .map((p) => ({ ...p, context: null }));
  };

  return (
    <ContextsProvider value={saved.contexts ?? {}}>
    <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-24">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="font-pixel text-[15px]">
          Talk Recap
        </Link>
        <div className="flex items-center gap-4">
          {!shared && <PastReportsMenu currentId={saved.id} />}
          <Link href="/new" className="text-[14px] text-haze hover:text-moon">
            새로 분석
          </Link>
        </div>
      </header>

      {shared && (
        <p className="mb-6 text-[13px] text-haze">
          공유된 결과예요 · {new Date(shared.expiresAt).toLocaleDateString("ko-KR")}까지 볼 수 있어요
        </p>
      )}

      {isMock && !shared && (
        <p className="mb-6 rounded-[14px] bg-dusk p-4 text-[14px] leading-[1.55] text-haze">
          지금은 목업 결과예요. <code className="text-moon">.env.local</code>에 <code className="text-moon">OPENAI_API_KEY</code>를
          넣고 서버를 다시 켜면 진짜 분석이 나와요.
        </p>
      )}

      <section className="pt-4">
        <p className="tabular text-[14px] text-haze">
          {fmt(stats.start)} ~ {fmt(stats.end)} · {stats.days}일 · 메시지 {stats.totalMessages.toLocaleString()}개
        </p>
        <h1 className="mt-2 text-[32px] leading-[1.2] font-extrabold tracking-[-0.03em]">{report.title}</h1>
        <p className="mt-3 text-[17px] leading-[1.6]">{report.oneLiner}</p>
      </section>

      {actions}

      <Section title="줄거리">
        <ol className="flex flex-col gap-4">
          {report.acts.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-pixel tabular mt-0.5 w-10 shrink-0 text-spark">{i + 1}막</span>
              <div>
                <p className="text-[16px] font-bold">{a.title}</p>
                <p className="text-[13px] text-haze">{a.period}</p>
                <p className="mt-1 text-[15px] leading-[1.6]">{a.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="멤버">
        <div className="flex flex-col gap-4">
          {report.members.map((m) => (
            <article key={m.name} className="overflow-hidden rounded-[var(--radius-card)] bg-dusk">
              <div className="p-5" style={{ background: color(m.name), color: "var(--color-night)" }}>
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <span className="grid size-6 place-items-center rounded-full bg-night/15 text-[12px]">
                    {initialOf(m.name)}
                  </span>
                  {m.name}
                </div>
                <p className="mt-2 text-[24px] leading-[1.25] font-extrabold tracking-[-0.02em]">{m.archetype}</p>
                {m.oneLiner && <p className="mt-2 text-[15px] leading-[1.5] font-semibold opacity-80">&ldquo;{m.oneLiner}&rdquo;</p>}
              </div>
              <div className="flex flex-col gap-4 p-5 text-[15px] leading-[1.6]">
                <p>{m.summary}</p>
                <Phrases samples={phrasesOf(m.name)} />
                {m.scenes.map((b, i) => (
                  <StoryCard key={`scene-${i}`} label="명장면" block={b} />
                ))}
                {m.sections.map((b, i) => (
                  <StoryCard key={`sec-${i}`} block={b} />
                ))}
                <Evidence quotes={m.quotes} />
                <ObjectionSlot target={`member:${m.name}`} owner={m.name} />
                <MemberCardSave member={m} color={color(m.name)} />
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="궁합">
        <ul className="flex flex-col gap-3">
          {pairs.map((p, i) => (
            <li key={`${p.a}-${p.b}`} className={`rounded-[var(--radius-card)] p-4 ${i === 0 ? "bg-dusk-2" : "bg-dusk"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold">
                  <span style={{ color: color(p.a) }}>{p.a}</span>
                  <span className="text-haze"> × </span>
                  <span style={{ color: color(p.b) }}>{p.b}</span>
                </p>
                <span className="font-pixel tabular text-[18px] text-spark">{p.score}</span>
              </div>
              <p className="mt-1 text-[14px] font-semibold">{p.label}</p>
              <p className="mt-1 text-[14px] leading-[1.55] text-haze">{p.reason}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="MBTI 추론">
        <div className="flex flex-col gap-3">
          {report.members.map((m) => (
            <details key={m.name} className="rounded-[var(--radius-card)] bg-dusk p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="text-[15px] font-semibold" style={{ color: color(m.name) }}>
                  {m.name}
                </span>
                <span className="flex items-baseline gap-2">
                  {m.mbti.claimed && (
                    <span className="text-[13px] text-haze">
                      본인 주장 <s>{m.mbti.claimed}</s>
                    </span>
                  )}
                  <span className="font-pixel text-[20px]">{m.mbti.type}</span>
                  <span className="tabular text-[12px] text-haze">{Math.round(m.mbti.confidence * 100)}%</span>
                </span>
              </summary>
              <ul className="mt-3 flex flex-col gap-2 text-[14px] leading-[1.55]">
                {(["ei", "sn", "tf", "jp"] as const).map((k) => (
                  <li key={k} className="flex gap-3">
                    <span className="font-pixel w-4 shrink-0 text-spark">{m.mbti[k].letter}</span>
                    <span className="text-haze">{m.mbti[k].reason}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <ObjectionSlot target={`mbti:${m.name}`} owner={m.name} />
              </div>
            </details>
          ))}
        </div>
      </Section>

      <Section title="What's in my bag">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {report.members.map((m) => (
            <BagItem key={m.name} member={m} color={color(m.name)} />
          ))}
        </div>
      </Section>

      <Section title="어워드">
        <ul className="flex flex-col gap-3">
          {report.awards.map((a, i) => (
            <li key={a.title} className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-dusk p-4">
              <p className="font-pixel text-[14px] text-spark">{a.title}</p>
              <p className="mt-1 text-[17px] font-bold" style={{ color: color(a.winner) }}>
                {a.winner}
              </p>
              <p className="mt-1 text-[14px] leading-[1.55] text-haze">{a.reason}</p>
              {a.quotes.length > 0 && (
                <div className="rounded-[14px] bg-dusk-2 px-4 py-3">
                  <QuoteList quotes={a.quotes} />
                </div>
              )}
              <ObjectionSlot target={`award:${i}`} owner={a.winner} />
            </li>
          ))}
        </ul>
      </Section>

      {/* [보류] 이미지 만들기 프롬프트 — 다시 켤 때 주석 해제 (docs/TASKS.md "보류 중인 기능")
      <Section title="이미지 만들기 프롬프트">
        <ImagePrompts report={report} colorOf={color} />
      </Section>
      */}

      <Section title="총평">
        <p className="text-[17px] leading-[1.7]">{report.closing}</p>
      </Section>

      <p className="mt-12 rounded-[14px] bg-dusk px-4 py-3 text-[13px] leading-[1.6] text-haze">
        MBTI·궁합·가방은 AI가 대화만 훔쳐보고 찍은 놀이용 결과예요. 맞으면 &ldquo;소름&rdquo;, 틀리면 &ldquo;역시
        AI&rdquo; 하고 웃어 넘겨 주세요. 진지하게 받아들이면 단톡방에 평화가 사라져요.
      </p>
    </main>
    </ContextsProvider>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-[22px] font-bold tracking-[-0.02em]">{title}</h2>
      {children}
    </section>
  );
}

function Evidence({ quotes }: { quotes: Quote[] }) {
  if (!quotes.length) return null;
  return (
    <details className="rounded-[14px] bg-dusk-2 px-4 py-3">
      <summary className="cursor-pointer text-[13px] font-semibold text-haze">근거 {quotes.length}개 보기</summary>
      <div className="mt-2">
        <QuoteList quotes={quotes} />
      </div>
    </details>
  );
}

/** 명장면·꼭지: 제목 + 이야기 + 그 장면 원문 */
function StoryCard({ label, block }: { label?: string; block: StoryBlock }) {
  return (
    <section className="rounded-[14px] bg-dusk-2 p-4">
      <h3 className="text-[14px] font-bold text-spark">
        {label && <span className="mr-1.5 text-haze">{label}</span>}
        {block.title}
      </h3>
      <p className="mt-1.5 text-[15px] leading-[1.6]">{block.text}</p>
      {block.quotes.length > 0 && (
        <div className="mt-3 border-t border-night/60 pt-3">
          <QuoteList quotes={block.quotes} />
        </div>
      )}
    </section>
  );
}

/** 말버릇: 실제로 친 문장 + 횟수. 누르면 그 말을 쓴 장면(앞뒤 2줄) */
function Phrases({ samples }: { samples: PhraseSample[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!samples.length) return null;
  const cur = open === null ? null : samples[open];
  return (
    <div>
      <p className="text-[13px] font-semibold text-haze">말버릇</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {samples.map((p, i) => (
          <li key={p.text}>
            <button
              type="button"
              disabled={!p.context}
              onClick={() => setOpen(open === i ? null : i)}
              aria-pressed={open === i}
              className={`rounded-full px-3 py-1.5 text-[14px] transition disabled:cursor-default ${open === i ? "bg-spark text-spark-ink" : "bg-dusk-2"}`}
            >
              <span className="font-semibold">&ldquo;{p.text}&rdquo;</span>
              <span className="tabular ml-1.5 text-[12px] opacity-70">×{p.count.toLocaleString()}</span>
            </button>
          </li>
        ))}
      </ul>
      {cur?.context && <ContextView block={cur.context} />}
      {samples.some((p) => p.context) && open === null && (
        <p className="mt-1.5 text-[12px] text-haze">누르면 실제로 쓴 장면이 보여요</p>
      )}
    </div>
  );
}

type Member = Report["members"][number];

function BagItem({ member, color }: { member: Member; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <BagCard ref={ref} member={member} color={color} />
      <details className="rounded-[14px] bg-dusk px-4 py-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-haze">왜 이 물건이?</summary>
        <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-[1.5]">
          {member.bag.items.map((it, i) => (
            <li key={i}>
              <span className="font-semibold">{it.item}</span> <span className="text-haze">{it.reason}</span>
            </li>
          ))}
        </ul>
      </details>
      <SaveImageButton target={ref} fileName={`talk-recap-bag-${member.name}.png`} className="self-start" label="가방 카드 저장" footer />
    </div>
  );
}

/** 멤버 카드(1080×1350)는 화면 밖에 그려두고 저장만 한다 */
function MemberCardSave({ member, color }: { member: Member; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <>
      <div className="pointer-events-none fixed top-0 -left-[10000px] w-[360px]" aria-hidden>
        <MemberCard ref={ref} member={member} color={color} />
      </div>
      <SaveImageButton target={ref} fileName={`talk-recap-card-${member.name}.png`} className="self-start" label="멤버 카드 저장" />
    </>
  );
}
