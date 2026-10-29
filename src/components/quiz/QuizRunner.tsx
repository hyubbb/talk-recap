"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { SavedReport } from "@/lib/report/storage";
import { buildQuiz, scoreOf } from "@/lib/quiz/build";
import { useMe } from "@/hooks/useLocalValue";
import type { RankRow } from "@/app/api/share/[id]/quiz/route";

/** "이 말 누가 했게?" 한 문제씩, 답하면 정답과 원문 날짜 공개, 끝나면 점수 카드(+공유 링크면 방 랭킹) */
export function QuizRunner({ saved, shareId }: { saved: SavedReport; shareId: string | null }) {
  const questions = useMemo(() => buildQuiz(saved), [saved]);
  const [me] = useMe(shareId);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [selfHits, setSelfHits] = useState(0);
  const [nickname, setNickname] = useState("");
  const [finished, setFinished] = useState(false);
  const back = shareId ? `/s/${shareId}` : `/r/${saved.id}`;
  const colorOf = (n: string) => saved.members.find((m) => m.name === n)?.color ?? "var(--color-haze)";

  const ranking = useQuery({
    queryKey: ["ranking", shareId],
    enabled: !!shareId,
    queryFn: async () => {
      const res = await fetch(`/api/share/${shareId}/quiz`);
      if (!res.ok) throw new Error("랭킹을 불러오지 못했어요.");
      return ((await res.json()) as { ranking: RankRow[] }).ranking;
    },
  });
  const save = useMutation({
    mutationFn: async (score: number) => {
      const res = await fetch(`/api/share/${shareId}/quiz`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), memberName: me || null, score }),
      });
      const b = (await res.json().catch(() => null)) as { ranking?: RankRow[]; error?: string } | null;
      if (!res.ok) throw new Error(b?.error ?? "점수를 저장하지 못했어요.");
      return b?.ranking ?? [];
    },
    onSuccess: () => ranking.refetch(),
  });

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

  const done = finished;
  const correct = answers.filter(Boolean).length;
  const score = scoreOf(correct, questions.length);

  if (done) {
    const rows = save.data ?? ranking.data ?? [];
    return (
      <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 py-10">
        <section className="rounded-[var(--radius-card)] bg-spark p-6 text-spark-ink">
          <p className="font-pixel text-[14px]">이 말 누가 했게?</p>
          <p className="tabular mt-2 text-[64px] leading-none font-black">{score}점</p>
          <p className="mt-2 text-[16px] font-semibold">
            {questions.length}문제 중 {correct}개 맞혔어요
          </p>
          {selfHits > 0 && (
            <p className="font-pixel mt-3 inline-block rounded-full bg-night px-3 py-1 text-[12px] text-spark">자기 말 맞히기 ×{selfHits}</p>
          )}
        </section>

        {shareId && (
          <section className="mt-8">
            <h2 className="text-[20px] font-bold">방 랭킹</h2>
            {!save.isSuccess && (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (nickname.trim()) save.mutate(score);
                }}
              >
                <label htmlFor="nick" className="sr-only">
                  닉네임
                </label>
                <input
                  id="nick"
                  value={nickname}
                  maxLength={20}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임 (1~20자)"
                  className="h-12 flex-1 rounded-[14px] bg-dusk px-4 text-[15px] outline-none"
                />
                <button type="submit" disabled={!nickname.trim() || save.isPending} className="h-12 rounded-[14px] bg-spark px-4 text-[15px] font-bold text-spark-ink disabled:opacity-40">
                  {save.isPending ? "저장 중…" : "점수 올리기"}
                </button>
              </form>
            )}
            {save.error && <p className="mt-2 text-[14px] text-danger">{save.error.message}</p>}
            <ol className="mt-4 flex flex-col gap-2">
              {rows.map((r, k) => (
                <li key={k} className="flex items-center gap-3 rounded-[14px] bg-dusk px-4 py-3">
                  <span className="font-pixel tabular w-6 text-spark">{k + 1}</span>
                  <span className="flex-1 truncate text-[15px] font-semibold">{r.nickname}</span>
                  <span className="tabular text-[15px]">{r.score}</span>
                </li>
              ))}
              {rows.length === 0 && <li className="text-[14px] text-haze">아직 아무도 안 풀었어요. 1등 해 보세요.</li>}
            </ol>
          </section>
        )}
        <Link href={back} className="mt-8 text-center text-[15px] text-haze">
          결과로 돌아가기
        </Link>
      </main>
    );
  }

  const q = questions[i];
  const answered = picked !== null;
  const choose = (opt: string) => {
    if (answered) return;
    setPicked(opt);
    const ok = opt === q.answer;
    setAnswers((a) => [...a, ok]);
    if (ok && q.kind === "quote" && me && q.answer === me) setSelfHits((n) => n + 1);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 py-8">
      <div className="flex items-center justify-between text-[14px] text-haze">
        <Link href={back}>그만하기</Link>
        <span className="tabular" aria-live="polite">
          {i + 1} / {questions.length}
        </span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-dusk" aria-hidden>
        <div className="h-full rounded-full bg-spark" style={{ width: `${((i + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
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
          {picked === q.answer && q.kind === "quote" && me === q.answer && (
            <p className="font-pixel mt-2 inline-block rounded-full bg-spark px-3 py-1 text-[12px] text-spark-ink">자기 말 맞히기</p>
          )}
          <button
            type="button"
            onClick={() => {
              if (i + 1 === questions.length) return setFinished(true);
              setPicked(null);
              setI((n) => n + 1);
            }}
            className="mt-6 h-14 w-full rounded-[16px] bg-spark text-[17px] font-bold text-spark-ink"
          >
            {i + 1 === questions.length ? "점수 보기" : "다음 문제"}
          </button>
        </div>
      )}
    </main>
  );
}
