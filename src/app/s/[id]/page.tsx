import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SharedExperience } from "@/components/share/SharedExperience";
import { getSharedReport, incrementView } from "@/lib/share/repo";

export const metadata: Metadata = {
  title: "톡방 Wrapped",
  robots: { index: false, follow: false },
};

// cacheComponents 환경: 동적 파라미터는 Suspense 안에서 읽는다
export default function SharedReportPage({ params }: PageProps<"/s/[id]">) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[560px] px-5 py-16 text-haze">불러오는 중…</main>}>
      <Loader params={params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: PageProps<"/s/[id]">["params"] }) {
  const { id } = await params;
  const shared = await getSharedReport(id);
  if (!shared) return <Missing />;
  await incrementView(id);
  return <SharedExperience saved={shared.saved} shareId={id} expiresAt={shared.expiresAt} />;
}

function Missing() {
  return (
    <main className="mx-auto max-w-[560px] px-5 py-16">
      <p className="font-pixel text-[15px] text-spark">404</p>
      <p className="mt-2 text-[17px] font-bold">이 링크는 열 수 없어요</p>
      <p className="mt-2 text-[15px] leading-[1.6] text-haze">
        공유가 중지됐거나 보관 기간(30일)이 지났어요. 링크를 보낸 사람에게 다시 물어봐 주세요.
      </p>
      <Link href="/new" className="mt-6 inline-block text-[15px] text-spark">
        우리 방도 분석하기
      </Link>
    </main>
  );
}
