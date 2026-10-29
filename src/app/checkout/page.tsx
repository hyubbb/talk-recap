import type { Metadata } from "next";
import { Suspense } from "react";
import { Checkout } from "@/components/pay/Checkout";

export const metadata: Metadata = { title: "주문 확인 · Talk Recap", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[560px] px-5 py-16 text-haze">불러오는 중…</main>}>
      <Checkout />
    </Suspense>
  );
}
