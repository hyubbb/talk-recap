import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTS, priceLabel } from "@/lib/legal/business";
import { PeriodNotice } from "@/components/pay/PeriodNotice";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "요금 안내 · Talk Recap" };

export default function PricingPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-16">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="font-pixel text-[15px]">
            Talk Recap
          </Link>
          <Link href="/new" className="text-[14px] text-haze hover:text-moon">
            대화 올리기
          </Link>
        </header>
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
          요금 안내
        </h1>
        <p className="mt-2 text-[15px] leading-[1.6] text-haze">
          대화 파일 올리기와 숫자 통계 미리보기는 무료예요. AI 분석은 시작할 때
          결제하고, 가격은 분석할 기간으로 정해져요.
        </p>

        <ul className="mt-6 flex flex-col gap-4">
          {PRODUCTS.map((p) => (
            <li key={p.id} className="rounded-[var(--radius-card)] bg-dusk p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[19px] font-bold">{p.name}</h2>
                <p className="tabular text-[22px] font-extrabold">
                  {priceLabel(p)}
                </p>
              </div>
              <p className="mt-1 text-[15px]">{p.scope}</p>
              <ul className="mt-3 flex flex-col gap-1 text-[13px] leading-[1.6] text-haze">
                <li>
                  · AI 리포트, 스토리 슬라이드, 멤버·가방 카드, 이미지 저장
                </li>
                <li>· 공유 링크(30일), 퀴즈, 반박 투표</li>
                <li>· 분석 1회, 결제 즉시 분석 (부가세 포함)</li>
              </ul>
            </li>
          ))}
        </ul>

        <Link
          href="/new"
          className="mt-6 flex h-14 items-center justify-center rounded-[16px] bg-spark text-[17px] font-bold text-spark-ink"
        >
          대화 올리고 분석 시작
        </Link>
        <Link
          href="/new?sample=1&pay=1"
          className="mt-3 flex h-12 items-center justify-center rounded-[14px] bg-dusk text-[15px] font-semibold"
        >
          샘플 대화로 결제 흐름 보기
        </Link>
        <p className="mt-2 text-center text-[12px] text-haze">
          지어낸 샘플 대화로 분석 시작 → 결제창까지 확인할 수 있어요.
        </p>

        <section className="mt-8 rounded-[var(--radius-card)] bg-dusk p-5">
          <h2 className="text-[15px] font-bold">제공 기간</h2>
          <PeriodNotice className="mt-2" />
        </section>

        <p className="mt-6 text-[13px] leading-[1.6] text-haze">
          결제는 토스페이로 진행돼요. 분석을 시작한 뒤에는 디지털 콘텐츠 특성상
          청약철회가 제한돼요. 자세한 기준은{" "}
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
      <SiteFooter />
    </>
  );
}
