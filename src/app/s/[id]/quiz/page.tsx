import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { getSharedReport } from "@/lib/share/repo";

export const metadata: Metadata = {
  title: "이 말 누가 했게? · 톡방 Wrapped",
  robots: { index: false, follow: false },
};

export default function SharedQuizPage({ params }: PageProps<"/s/[id]/quiz">) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[560px] px-5 py-16 text-haze">불러오는 중…</main>}>
      <Loader params={params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: PageProps<"/s/[id]/quiz">["params"] }) {
  const { id } = await params;
  const shared = await getSharedReport(id);
  if (!shared) {
    return (
      <main className="mx-auto max-w-[560px] px-5 py-16">
        <p className="font-pixel text-[15px] text-spark">404</p>
        <p className="mt-2 text-[17px] font-bold">이 링크는 열 수 없어요</p>
        <Link href="/new" className="mt-6 inline-block text-[15px] text-spark">
          우리 방도 분석하기
        </Link>
      </main>
    );
  }
  return <QuizRunner saved={shared.saved} shareId={id} />;
}
