"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BUSINESS, productById, won } from "@/lib/legal/business";
import { saveOrder } from "@/lib/pay/local";
import { PeriodNotice } from "./PeriodNotice";

/** 주문을 만들고 토스페이 결제창으로 보낸다 (주문 비밀값은 이 브라우저에 보관) */
async function startCheckout(plan: string): Promise<void> {
  const res = await fetch("/api/pay/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan, agreed: true }),
  });
  const b = (await res.json().catch(() => null)) as { orderNo?: string; secret?: string; checkoutPage?: string; error?: string } | null;
  if (!res.ok || !b?.checkoutPage || !b.orderNo || !b.secret) throw new Error(b?.error ?? "결제창을 열지 못했어요.");
  saveOrder({ orderNo: b.orderNo, secret: b.secret, plan: plan as "lite" | "full", createdAt: Date.now() });
  window.location.assign(b.checkoutPage);
}

/** 주문 확인 → 동의 → 토스페이 결제창 */
export function Checkout() {
  const params = useSearchParams();
  const product = productById(params.get("plan") ?? "") ?? productById("lite")!;
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      await startCheckout(product.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요.");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="font-pixel text-[15px]">
          Talk Recap
        </Link>
        <Link href="/pricing" className="text-[14px] text-haze hover:text-moon">
          요금 안내
        </Link>
      </header>
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">주문 확인</h1>

      <section className="mt-6 rounded-[var(--radius-card)] bg-dusk p-5">
        <dl className="grid grid-cols-[88px_1fr] gap-y-2 text-[15px]">
          <dt className="text-haze">상품</dt>
          <dd className="font-semibold">
            {BUSINESS.serviceName} {product.name}
          </dd>
          <dt className="text-haze">내용</dt>
          <dd>{product.scope} (분석 1회)</dd>
          <dt className="text-haze">결제 금액</dt>
          <dd className="tabular text-[20px] font-extrabold">{won(product.price)}</dd>
          <dt className="text-haze">결제 수단</dt>
          <dd>토스페이</dd>
        </dl>
      </section>

      <section className="mt-4 rounded-[var(--radius-card)] bg-dusk p-5">
        <h2 className="text-[15px] font-bold">제공 기간</h2>
        <PeriodNotice className="mt-2" />
      </section>

      <section className="mt-4 rounded-[var(--radius-card)] border border-danger/40 p-5">
        <h2 className="text-[15px] font-bold">청약철회 안내</h2>
        <p className="mt-1 text-[13px] leading-[1.6] text-haze">
          이 상품은 분석을 시작하면 결과 제공이 바로 개시되는 디지털 콘텐츠예요. 분석을 시작한 뒤에는 「전자상거래법」 제17조 제2항 제5호에 따라
          청약철회가 제한돼요. 결제 후 분석을 시작하지 않았다면 7일 안에 전액 환불받을 수 있어요.
        </p>
      </section>

      <label className="mt-6 flex items-start gap-2 text-[14px] leading-[1.55]">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 size-4 accent-spark" />
        <span>
          주문 내용과 제공 기간, 청약철회 제한을 확인했고{" "}
          <Link href="/terms" className="underline">
            이용약관
          </Link>
          ·
          <Link href="/refund" className="underline">
            환불 정책
          </Link>
          ·
          <Link href="/privacy" className="underline">
            개인정보처리방침
          </Link>
          에 동의해요. (필수)
        </span>
      </label>

      <button
        type="button"
        disabled={!agreed || busy}
        onClick={pay}
        className="mt-4 flex h-14 items-center justify-center rounded-[16px] bg-[#0064FF] text-[17px] font-bold text-white disabled:opacity-40"
      >
        {busy ? "결제창 여는 중…" : `토스페이로 ${won(product.price)} 결제하기`}
      </button>
      {error && (
        <p className="mt-3 text-[14px] text-danger" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
