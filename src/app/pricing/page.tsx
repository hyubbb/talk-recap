import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTS, won } from "@/lib/legal/business";
import { PeriodNotice } from "@/components/pay/PeriodNotice";

export const metadata: Metadata = { title: "요금 안내 · Talk Recap" };

export default function PricingPage() {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="font-pixel text-[15px]">
          Talk Recap
        </Link>
        <Link href="/new" className="text-[14px] text-haze hover:text-moon">
          대화 올리기
        </Link>
      </header>
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">요금 안내</h1>
      <p className="mt-2 text-[15px] leading-[1.6] text-haze">
        대화 파일 올리기와 숫자 통계 미리보기는 무료예요. AI 분석은 분석할 기간에 따라 이용권을 골라요.
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {PRODUCTS.map((p) => (
          <li key={p.id} className="rounded-[var(--radius-card)] bg-dusk p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[19px] font-bold">{p.name}</h2>
              <p className="tabular text-[22px] font-extrabold">{won(p.price)}</p>
            </div>
            <p className="mt-1 text-[15px]">{p.scope}</p>
            <ul className="mt-3 flex flex-col gap-1 text-[13px] leading-[1.6] text-haze">
              <li>· AI 리포트, 스토리 슬라이드, 멤버·가방 카드, 이미지 저장</li>
              <li>· 공유 링크(30일), 퀴즈, 반박 투표</li>
              <li>· 분석 1회 이용권 (부가세 포함)</li>
            </ul>
            <Link
              href={`/checkout?plan=${p.id}`}
              className="mt-4 flex h-12 items-center justify-center rounded-[14px] bg-spark text-[16px] font-bold text-spark-ink"
            >
              {p.name} 구매하기
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-[var(--radius-card)] bg-dusk p-5">
        <h2 className="text-[15px] font-bold">제공 기간</h2>
        <PeriodNotice className="mt-2" />
      </section>

      <p className="mt-6 text-[13px] leading-[1.6] text-haze">
        결제는 토스페이로 진행돼요. 분석을 시작한 뒤에는 디지털 콘텐츠 특성상 청약철회가 제한돼요. 자세한 기준은{" "}
        <Link href="/refund" className="underline">
          환불 정책
        </Link>
        과{" "}
        <Link href="/terms#refund" className="underline">
          이용약관 제9조
        </Link>
        를 확인해 주세요.
      </p>
    </main>
  );
}
