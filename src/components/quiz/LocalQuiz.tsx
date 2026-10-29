"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { loadReport } from "@/lib/report/storage";
import { QuizRunner } from "./QuizRunner";

const noop = () => () => {};

export function LocalQuiz({ id }: { id: string }) {
  const raw = useSyncExternalStore(noop, () => JSON.stringify(loadReport(id)), () => "null");
  const saved = JSON.parse(raw) as ReturnType<typeof loadReport>;
  if (!saved) {
    return (
      <main className="mx-auto max-w-[560px] px-5 py-16">
        <p className="text-[17px] font-bold">이 결과를 찾을 수 없어요</p>
        <Link href="/new" className="mt-6 inline-block text-spark">
          새로 분석하기
        </Link>
      </main>
    );
  }
  return <QuizRunner saved={saved} shareId={null} />;
}
