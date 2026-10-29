"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { listReports, type ReportSummary } from "@/lib/report/storage";

const noopSubscribe = () => () => {};
// useSyncExternalStore는 같은 값이면 같은 참조를 원해서 문자열로 비교한다
const snapshot = () => JSON.stringify(listReports());

const day = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};

/** 이 브라우저에 저장된 지난 결과. 없으면 아무것도 그리지 않는다 */
export function RecentReports() {
  const raw = useSyncExternalStore(noopSubscribe, snapshot, () => "[]");
  const items = useMemo(() => JSON.parse(raw) as ReportSummary[], [raw]);
  if (items.length === 0) return null;
  return (
    <section className="mt-6" aria-labelledby="recent-reports">
      <h2 id="recent-reports" className="text-[14px] font-semibold text-haze">
        지난 결과
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              href={`/r/${r.id}`}
              className="flex items-center justify-between gap-3 rounded-[14px] bg-dusk px-4 py-3 hover:bg-dusk-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{r.title}</span>
                <span className="tabular mt-0.5 block text-[12px] text-haze">
                  {r.start ? `${day(r.start)} ~ ${day(r.end)} · ` : ""}멤버 {r.memberCount}명
                </span>
              </span>
              <span className="shrink-0 text-[14px] font-semibold text-spark">결과 보기</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
