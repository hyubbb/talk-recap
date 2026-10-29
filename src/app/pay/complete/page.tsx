import type { Metadata } from "next";
import { Suspense } from "react";
import { PayComplete } from "@/components/pay/PayResult";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "결제 완료 · Talk Recap",
  robots: { index: false, follow: false },
};

export default function PayCompletePage() {
  return (
    <>
      <Suspense
        fallback={
          <main className="mx-auto max-w-[560px] px-5 py-16 text-haze">
            불러오는 중…
          </main>
        }
      >
        <PayComplete />
      </Suspense>
      <SiteFooter />
    </>
  );
}
