import { Suspense } from "react";
import { LocalQuiz } from "@/components/quiz/LocalQuiz";

// 업로더 브라우저 저장본으로 미리 풀어보기 (랭킹 저장은 공유 링크에서만)
export default function LocalQuizPage({ params }: PageProps<"/r/[id]/quiz">) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[560px] px-5 py-16 text-haze">불러오는 중…</main>}>
      <Loader params={params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: PageProps<"/r/[id]/quiz">["params"] }) {
  const { id } = await params;
  return <LocalQuiz id={id} />;
}
