"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ReportView } from "./ReportView";
import { loadReport } from "@/lib/report/storage";

const noop = () => () => {};

export function ReportLoader({ id }: { id: string }) {
  // localStorage는 브라우저에서만 읽을 수 있으므로 서버 렌더 때는 null
  const raw = useSyncExternalStore(
    noop,
    () => JSON.stringify(loadReport(id)),
    () => "null",
  );
  const saved = JSON.parse(raw) as ReturnType<typeof loadReport>;

  if (!saved) {
    return (
      <main className="mx-auto max-w-[560px] px-5 py-16">
        <p className="text-[17px] font-bold">이 결과를 찾을 수 없어요</p>
        <p className="mt-2 text-[15px] text-haze">
          지금은 분석한 브라우저에만 결과가 저장돼요. 같은 브라우저에서 열었는지 확인해 주세요.
        </p>
        <Link href="/new" className="mt-6 inline-block text-[15px] text-spark">
          새로 분석하기
        </Link>
      </main>
    );
  }
  return <ReportView saved={saved} />;
}
