"use client";

import { useAtomValue } from "jotai";
import { peopleAtom, statsAtom } from "@/state/upload";
import { isSensitive } from "@/lib/quiz/sensitive";
import { Locked } from "@/components/Locked";

/**
 * 무료 미리 보기 위쪽 한 줄 요약 + 아래 "AI 분석으로 열리는 것" 잠긴 칸.
 * 전부 브라우저에서 계산한 통계로 만들어서 비용이 없고, 우리 방 친구 이름이 그대로 들어가 결제 이유가 된다.
 */
export function useRoomHighlights() {
  const stats = useAtomValue(statsAtom);
  const people = useAtomValue(peopleAtom);
  if (!stats || stats.members.length === 0) return null;
  const nameOf = (id: string) => people.find((p) => p.id === id)?.displayName ?? "누군가";
  const top = stats.members[0];
  // 한 사람만 반복되지 않게, 가능하면 서로 다른 사람으로 고른다
  const used = new Set([top.id]);
  const prefer = <T extends { id: string }>(list: T[]) => list.find((m) => !used.has(m.id)) ?? list[0];
  const withPhrase = stats.members.filter((m) => m.catchphrases.some((c) => !isSensitive(c.text)));
  const phraseOwner = withPhrase.length ? prefer(withPhrase) : undefined;
  if (phraseOwner) used.add(phraseOwner.id);
  const phrase = phraseOwner?.catchphrases.find((c) => !isSensitive(c.text)) ?? null;
  const owls = [...stats.members].filter((m) => m.nightRatio > 0).sort((a, b) => b.nightRatio - a.nightRatio);
  const owl = owls.length ? prefer(owls.slice(0, 2)) : undefined;
  const others = stats.members.map((m) => nameOf(m.id));
  // 서로 말을 가장 많이 주고받은 두 사람
  let pair: [string, string] | null = null;
  let best = 0;
  for (const a of stats.members)
    for (const b of stats.members) {
      if (a.id >= b.id) continue;
      const n = (stats.replies[a.id]?.[b.id] ?? 0) + (stats.replies[b.id]?.[a.id] ?? 0);
      if (n > best) {
        best = n;
        pair = [a.id, b.id];
      }
    }
  return {
    top: { name: nameOf(top.id), messages: top.messages, share: top.share },
    phrase: phrase && phraseOwner ? { name: nameOf(phraseOwner.id), text: phrase.text, count: phrase.count } : null,
    owl: owl ? { name: nameOf(owl.id), ratio: owl.nightRatio } : null,
    names: others,
    pair: pair ? { a: nameOf(pair[0]), b: nameOf(pair[1]) } : null,
    count: stats.members.length,
  };
}

/** 미리 보기 맨 위: 벌써 나온 우리 방 이야기 (무료) */
export function RoomHeadline() {
  const h = useRoomHighlights();
  if (!h) return null;
  return (
    <div className="rounded-[var(--radius-card)] bg-spark p-5 text-spark-ink">
      <p className="font-pixel text-[13px]">벌써 보이는 우리 방</p>
      <ul className="mt-3 flex flex-col gap-1.5 text-[16px] leading-[1.5] font-semibold">
        <li>
          수다왕은 <b className="font-extrabold">{h.top.name}</b>, 전체의 {(h.top.share * 100).toFixed(0)}%
        </li>
        {h.phrase && (
          <li>
            {h.phrase.name}의 말버릇 &lsquo;{h.phrase.text}&rsquo; {h.phrase.count.toLocaleString()}번
          </li>
        )}
        {h.owl && (
          <li>
            새벽 지킴이는 <b className="font-extrabold">{h.owl.name}</b>
          </li>
        )}
      </ul>
    </div>
  );
}

/** 미리 보기 맨 아래: AI 분석을 하면 열리는 칸 (우리 방 이름으로) */
export function AiTeaser() {
  const h = useRoomHighlights();
  if (!h) return null;
  const items = [
    { title: `${h.names[0]}의 명장면`, hint: "실제 대화 근거와 앞뒤 문맥까지" },
    h.pair && { title: `${h.pair.a} × ${h.pair.b} 궁합 ??점`, hint: "멤버 쌍마다 점수와 관계 한 단어" },
    { title: `${h.names[1] ?? h.names[0]}의 MBTI ????`, hint: "본인 주장 vs 대화로 본 추론" },
    h.phrase && { title: `'${h.phrase.text}'의 진짜 뜻`, hint: "우리 방 사전, AI 뜻풀이" },
    { title: `${h.names[2] ?? h.names[0]}의 가방 속`, hint: "대화로 추측한 물건 8~10개" },
    { title: "우리 방 어워드 6~8개", hint: "수상 근거 메시지와 함께" },
  ].filter((x): x is { title: string; hint: string } => Boolean(x));
  return (
    <section className="mt-6" aria-labelledby="ai-teaser-title">
      <h3 id="ai-teaser-title" className="text-[17px] font-bold">
        AI 분석으로 열리는 것
      </h3>
      <p className="mt-1 text-[14px] text-haze">멤버 {h.count}명 모두, 우리 방 친구 이름으로 나와요.</p>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {items.map((it) => (
          <Locked key={it.title} title={it.title} hint={it.hint} cta={null} lines={2} />
        ))}
      </div>
      <p className="mt-3 text-center text-[13px] text-haze">아래 &lsquo;AI 분석 시작&rsquo;을 누르면 열려요</p>
    </section>
  );
}
