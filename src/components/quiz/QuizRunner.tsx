"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SavedReport } from "@/lib/report/storage";
import { buildQuiz, scoreOf } from "@/lib/quiz/build";
import { cleanNickname, NICKNAME_MAX, resultLabel, type RankRow } from "@/lib/quiz/ranking";
import { useLocalValue, useMe } from "@/hooks/useLocalValue";

type Phase = "intro" | "playing" | "finished";

/**
 * "이 말 누가 했게?"
 * 1) 이름 입력(방 멤버 중 고르거나 직접 입력) → 2) 한 문제씩 → 3) 내 결과 + 방 사람들이 몇 개 맞혔는지
 * 공유 링크(shareId)에서만 결과를 저장하고 목록을 보여준다.
 */
export function QuizRunner({ saved, shareId }: { saved: SavedReport; shareId: string | null }) {
  const questions = useMemo(() => buildQuiz(saved), [saved]);
  const [me] = useMe(shareId);
  const [storedName, setStoredName] = useLocalValue(`tokbang:quizname:${shareId ?? `local:${saved.id}`}`);
  const [phase, setPhase] = useState<Phase>("intro");
  const [name, setName] = useState("");
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [selfHits, setSelfHits] = useState(0);
  const back = shareId ? `/s/${shareId}` : `/r/${saved.id}`;
  const memberNames = saved.members.map((m) => m.name);
  const colorOf = (n: string | null) => saved.members.find((m) => m.name === n)?.color ?? "var(--color-haze)";

  // 이름 기본값: 지난번 퀴즈 이름 → "나는 누구?"에서 고른 이름
  const nameSeeded = useRef(false);
  useEffect(() => {
    if (nameSeeded.current || storedName === undefined || me === undefined) return;
    nameSeeded.current = true;
    setName(storedName ?? (me || ""));
  }, [storedName, me]);

  const cleanName = cleanNickname(name);
  const memberName = memberNames.includes(cleanName) ? cleanName : null;

  const ranking = useQuery({
    queryKey: ["quiz-ranking", shareId],
    enabled: !!shareId,
    queryFn: async () => {
      const res = await fetch(`/api/share/${shareId}/quiz`);
      if (!res.ok) throw new Error("결과를 불러오지 못했어요.");
      return ((await res.json()) as { ranking: RankRow[] }).ranking;
    },
  });

  const save = useMutation({
    mutationFn: async (correct: number) => {
      const res = await fetch(`/api/share/${shareId}/quiz`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: cleanName, memberName, correct, total: questions.length }),
      });
      const b = (await res.json().catch(() => null)) as { ranking?: RankRow[]; error?: string } | null;
      if (!res.ok) throw new Error(b?.error ?? "결과를 저장하지 못했어요.");
      return b?.ranking ?? [];
    },
    onSuccess: () => ranking.refetch(),
  });

  const correct = answers.filter(Boolean).length;
  const score = scoreOf(correct, questions.length);

  // 다 풀면 자동 저장 (공유 링크에서 한 번만)
  const savedOnce = useRef(false);
  useEffect(() => {
    if (phase !== "finished" || !shareId || savedOnce.current) return;
    savedOnce.current = true;
    save.mutate(correct);
  }, [phase, shareId, correct, save]);

  if (questions.length === 0) {
    return (
      <main className="mx-auto max-w-[560px] px-5 py-16">
        <p className="text-[17px] font-bold">퀴즈를 만들 인용이 부족해요</p>
        <Link href={back} className="mt-6 inline-block text-spark">
          돌아가기
        </Link>
      </main>
    );
  }

  // ── 1. 이름 입력 ────────────────────────────────────────────
  if (phase === "intro") {
    const players = ranking.data?.length ?? 0;
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 py-8">
        <Link href={back} className="text-[14px] text-haze">
          돌아가기
        </Link>
        <p className="font-pixel mt-10 text-[15px] text-spark">이 말 누가 했게?</p>
        <h1 className="mt-2 text-[28px] leading-[1.25] font-extrabold tracking-[-0.03em]">
          단톡방 말, {questions.length}문제
          <br />몇 개나 맞힐 수 있을까요
        </h1>
        {shareId && (
          <p className="mt-3 text-[14px] text-haze">
            {players > 0 ? `지금까지 ${players}명이 풀었어요.` : "아직 아무도 안 풀었어요. 첫 기록을 남겨 보세요."}
          </p>
        )}

        <form
          className="mt-10 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (!cleanName) return;
            setStoredName(cleanName);
            setPhase("playing");
          }}
        >
          <p className="text-[15px] font-semibold" id="quiz-name-label">
            누구로 풀까요?
          </p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="quiz-name-label">
            {memberNames.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={cleanName === n}
                onClick={() => setName(n)}
                className={`flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors ${
                  cleanName === n ? "bg-spark text-spark-ink" : "bg-dusk text-moon"
                }`}
              >
                <span className="size-2.5 rounded-full" style={{ background: colorOf(n) }} aria-hidden />
                {n}
              </button>
            ))}
          </div>

          <label htmlFor="quiz-name" className="mt-6 text-[13px] text-haze">
            방 멤버가 아니면 이름을 직접 적어 주세요
          </label>
          <input
            id="quiz-name"
            value={name}
            maxLength={NICKNAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder={`이름 (1~${NICKNAME_MAX}자)`}
            autoComplete="nickname"
            className="mt-2 h-12 rounded-[14px] bg-dusk px-4 text-[16px] outline-none focus:ring-2 focus:ring-spark"
          />
          {!shareId && (
            <p className="mt-3 text-[13px] leading-[1.55] text-haze">
              지금은 미리 풀기라 결과가 저장되지 않아요. 공유 링크에서 풀면 다른 사람들과 맞힌 개수를 비교할 수 있어요.
            </p>
          )}

          <button
            type="submit"
            disabled={!cleanName}
            className="mt-auto h-14 w-full rounded-[16px] bg-spark text-[17px] font-bold text-spark-ink disabled:opacity-40"
          >
            {cleanName ? "이 이름으로 시작하기" : "이름을 고르면 시작할 수 있어요"}
          </button>
        </form>
      </main>
    );
  }

  // ── 3. 결과 ────────────────────────────────────────────────
  if (phase === "finished") {
    const rows = save.data ?? ranking.data ?? [];
    const myKey = cleanName.toLowerCase();
    return (
      <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 py-10">
        <section className="rounded-[var(--radius-card)] bg-spark p-6 text-spark-ink">
          <p className="font-pixel text-[14px]">이 말 누가 했게?</p>
          <p className="mt-3 text-[16px] font-semibold">{cleanName}님은</p>
          <p className="tabular mt-1 text-[52px] leading-none font-black tracking-[-0.03em]">
            {score}점
          </p>
          <p className="mt-2 text-[16px] font-semibold">
            {questions.length}문제 중 {correct}문제 맞혔어요
          </p>
          {selfHits > 0 && (
            <p className="font-pixel mt-3 inline-block rounded-full bg-night px-3 py-1 text-[12px] text-spark">
              자기 말 맞히기 ×{selfHits}
            </p>
          )}
        </section>

        {shareId ? (
          <section className="mt-8">
            <h2 className="text-[20px] font-bold">누가 몇 점 받았나</h2>
            {save.isPending && <p className="mt-3 text-[14px] text-haze">결과 올리는 중…</p>}
            {save.error && (
              <div className="mt-3 flex items-center gap-3">
                <p className="text-[14px] text-danger">{save.error.message}</p>
                <button type="button" onClick={() => save.mutate(correct)} className="text-[14px] font-semibold text-spark">
                  다시 올리기
                </button>
              </div>
            )}
            <ol className="mt-4 flex flex-col gap-2">
              {rows.map((r, k) => {
                const mine = r.nickname.toLowerCase() === myKey;
                return (
                  <li
                    key={`${r.nickname}-${k}`}
                    className={`flex items-center gap-3 rounded-[14px] px-4 py-3 ${mine ? "bg-dusk-2 ring-1 ring-spark" : "bg-dusk"}`}
                  >
                    <span className="font-pixel tabular w-6 text-spark">{k + 1}</span>
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(r.memberName) }} aria-hidden />
                    <span className="flex-1 truncate text-[15px] font-semibold">
                      {r.nickname}
                      {mine && <span className="ml-1.5 text-[12px] text-haze">나</span>}
                    </span>
                    <span className="tabular text-[15px]">{resultLabel(r)}</span>
                  </li>
                );
              })}
              {rows.length === 0 && !save.isPending && <li className="text-[14px] text-haze">아직 기록이 없어요.</li>}
            </ol>
            <p className="mt-3 text-[12px] text-haze">같은 이름으로 여러 번 풀면 가장 좋은 기록만 보여요.</p>
          </section>
        ) : (
          <p className="mt-6 text-[14px] leading-[1.6] text-haze">
            미리 풀기라 결과는 저장되지 않았어요. 공유 링크를 만들어 방에 보내면 다른 사람들이 몇 점 받았는지 볼 수 있어요.
          </p>
        )}

        <div className="mt-8 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setAnswers([]);
              setSelfHits(0);
              setPicked(null);
              setI(0);
              savedOnce.current = false;
              save.reset();
              setPhase("intro");
            }}
            className="h-12 flex-1 rounded-[14px] bg-dusk text-[15px] font-semibold"
          >
            다시 풀기
          </button>
          <Link
            href={back}
            className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-dusk text-[15px] font-semibold"
          >
            결과로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  // ── 2. 문제 풀기 ────────────────────────────────────────────
  const q = questions[i];
  const answered = picked !== null;
  const choose = (opt: string) => {
    if (answered) return;
    setPicked(opt);
    const ok = opt === q.answer;
    setAnswers((a) => [...a, ok]);
    if (ok && q.kind === "quote" && memberName && q.answer === memberName) setSelfHits((n) => n + 1);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 py-8">
      <div className="flex items-center justify-between text-[14px] text-haze">
        <Link href={back}>그만하기</Link>
        <span className="truncate px-3">{cleanName}</span>
        <span className="tabular" aria-live="polite">
          {i + 1} / {questions.length}
        </span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-dusk" aria-hidden>
        <div
          className="h-full rounded-full bg-spark"
          style={{ width: `${((i + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <h1 className="mt-8 text-[15px] font-semibold text-haze">{q.kind === "quote" ? "이 말 누가 했게?" : "통계 문제"}</h1>
      <p className="mt-3 rounded-[var(--radius-bubble)] bg-dusk p-5 text-[22px] leading-[1.45] font-bold">
        {q.kind === "quote" ? `“${q.prompt}”` : q.prompt}
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-3">
        {q.options.map((opt) => {
          const isAnswer = opt === q.answer;
          const isPicked = opt === picked;
          return (
            <li key={opt}>
              <button
                type="button"
                onClick={() => choose(opt)}
                disabled={answered}
                className={`flex h-14 w-full items-center gap-2 rounded-[16px] px-4 text-left text-[16px] font-semibold transition-colors ${
                  answered && isAnswer ? "bg-spark text-spark-ink" : answered && isPicked ? "bg-danger/80 text-night" : "bg-dusk"
                }`}
              >
                <span className="size-3 shrink-0 rounded-full" style={{ background: colorOf(opt) }} aria-hidden />
                <span className="truncate">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="bubble-in mt-6" aria-live="polite">
          <p className="text-[17px] font-bold">{picked === q.answer ? "정답!" : `땡, 정답은 ${q.answer}`}</p>
          <p className="mt-1 text-[14px] text-haze">{q.kind === "quote" ? `${q.reveal}에 한 말` : q.reveal}</p>
          {picked === q.answer && q.kind === "quote" && memberName === q.answer && (
            <p className="font-pixel mt-2 inline-block rounded-full bg-spark px-3 py-1 text-[12px] text-spark-ink">
              자기 말 맞히기
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (i + 1 === questions.length) return setPhase("finished");
              setPicked(null);
              setI((n) => n + 1);
            }}
            className="mt-6 h-14 w-full rounded-[16px] bg-spark text-[17px] font-bold text-spark-ink"
          >
            {i + 1 === questions.length ? "결과 보기" : "다음 문제"}
          </button>
        </div>
      )}
    </main>
  );
}
