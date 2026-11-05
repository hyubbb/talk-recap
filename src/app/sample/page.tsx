"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { installSampleReport, SAMPLE_ID } from "@/lib/report/sample";

/** 샘플 결과 미리 보기: 미리 만든 결과를 이 브라우저에 넣고 결과 화면으로 보낸다 (결제·AI 없음) */
export default function SamplePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    installSampleReport()
      .then(() => router.replace(`/r/${SAMPLE_ID}`))
      .catch((e: Error) => setError(e.message));
  }, [router]);
  return (
    <main className="mx-auto max-w-[560px] px-5 py-16">
      {error ? (
        <>
          <p className="text-[17px] font-bold">{error}</p>
          <Link href="/new" className="mt-6 inline-block text-[15px] text-spark">
            내 대화 올리기
          </Link>
        </>
      ) : (
        <p className="text-haze" role="status">
          샘플 결과를 여는 중…
        </p>
      )}
    </main>
  );
}
