"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BUSINESS, SERVICE_PERIOD, productById, won } from "@/lib/legal/business";
import { findOrder } from "@/lib/pay/local";
import type { PublicOrder } from "@/lib/pay/repo";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "-");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ko-KR") : "-");

/** 결제 완료 화면. 토스페이 상태 확인 API로 다시 확인한 결과를 보여준다 */
export function PayComplete() {
  const orderNo = useSearchParams().get("order") ?? "";
  const q = useQuery({
    queryKey: ["order", orderNo],
    queryFn: async () => {
      const local = findOrder(orderNo);
      if (!local) throw new Error("이 브라우저에서 만든 주문이 아니에요.");
      const res = await fetch(`/api/pay/order?order=${encodeURIComponent(orderNo)}`, { headers: { "x-order-secret": local.secret } });
      const b = (await res.json().catch(() => null)) as { order?: PublicOrder; error?: string } | null;
      if (!res.ok || !b?.order) throw new Error(b?.error ?? "주문을 확인하지 못했어요.");
      return b.order;
    },
    // 콜백보다 화면이 먼저 오면 잠깐 대기 상태일 수 있다
    refetchInterval: (query) => (query.state.data?.status === "created" ? 1500 : false),
    retry: 1,
  });

  const o = q.data;
  const product = o ? productById(o.plan) : null;

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-16">
      <header className="py-5">
        <Link href="/" className="font-pixel text-[15px]">
          Talk Recap
        </Link>
      </header>
      {q.isPending && <p className="text-haze">결제를 확인하는 중…</p>}
      {q.error && (
        <>
          <h1 className="text-[24px] font-extrabold">결제를 확인하지 못했어요</h1>
          <p className="mt-2 text-[15px] text-haze">{q.error.message}</p>
          <p className="mt-2 text-[14px] text-haze">
            결제가 됐는데 이 화면이 보이면 {BUSINESS.email}로 주문번호({orderNo})를 보내 주세요.
          </p>
        </>
      )}
      {o && o.status === "created" && <p className="text-haze">결제 완료를 기다리는 중…</p>}
      {o && (o.status === "paid" || o.status === "used") && product && (
        <>
          <p className="font-pixel text-[14px] text-spark">결제 완료</p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.03em]">{product.name} 이용권이 준비됐어요</h1>
          {o.mode === "TEST" && (
            <p className="mt-2 rounded-[12px] bg-dusk-2 px-3 py-2 text-[13px] text-haze">테스트 결제예요. 실제로 돈이 나가지 않았어요.</p>
          )}
          <section className="mt-6 rounded-[var(--radius-card)] bg-dusk p-5">
            <dl className="grid grid-cols-[96px_1fr] gap-y-2 text-[14px]">
              <dt className="text-haze">주문번호</dt>
              <dd className="tabular break-all">{o.orderNo}</dd>
              <dt className="text-haze">상품</dt>
              <dd>
                {product.name} · {product.scope}
              </dd>
              <dt className="text-haze">결제 금액</dt>
              <dd className="tabular font-bold">{won(o.amount)}</dd>
              <dt className="text-haze">결제 일시</dt>
              <dd>{fmt(o.paidAt)}</dd>
              <dt className="text-haze">사용 기한</dt>
              <dd>{day(o.useExpiresAt)}까지 (결제일부터 {SERVICE_PERIOD.useDays}일)</dd>
            </dl>
          </section>
          <p className="mt-3 text-[13px] leading-[1.6] text-haze">
            분석 결과의 재열람·이미지 다운로드·공유 링크는 분석일부터 {SERVICE_PERIOD.resultDays}일 동안 제공돼요. 분석을 시작하기 전에는 7일 안에 전액
            환불받을 수 있어요.
          </p>
          <Link href="/new" className="mt-6 flex h-14 items-center justify-center rounded-[16px] bg-spark text-[17px] font-bold text-spark-ink">
            대화 올리고 분석 시작
          </Link>
        </>
      )}
      {o && (o.status === "canceled" || o.status === "refunded") && (
        <>
          <h1 className="text-[24px] font-extrabold">{o.status === "canceled" ? "결제가 취소됐어요" : "환불된 주문이에요"}</h1>
          <Link href="/pricing" className="mt-6 text-spark">
            요금 안내로 돌아가기
          </Link>
        </>
      )}
    </main>
  );
}

export function PayCancel() {
  const orderNo = useSearchParams().get("order") ?? "";
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-16">
      <header className="py-5">
        <Link href="/" className="font-pixel text-[15px]">
          Talk Recap
        </Link>
      </header>
      <h1 className="text-[24px] font-extrabold">결제를 취소했어요</h1>
      <p className="mt-2 text-[15px] text-haze">결제되지 않았어요. {orderNo && `(주문번호 ${orderNo})`}</p>
      <Link href="/pricing" className="mt-6 flex h-12 items-center justify-center rounded-[14px] bg-dusk text-[15px] font-semibold">
        요금 안내로 돌아가기
      </Link>
    </main>
  );
}
