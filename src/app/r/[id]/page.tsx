import { Suspense } from "react";
import { ReportLoader } from "@/components/report/ReportLoader";

// cacheComponents 환경: 동적 파라미터는 Suspense 안에서 읽는다
export default function ReportPage({ params }: PageProps<"/r/[id]">) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[560px] px-5 py-16 text-haze">불러오는 중…</main>}>
      <Loader params={params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: PageProps<"/r/[id]">["params"] }) {
  const { id } = await params;
  return <ReportLoader id={id} />;
}
