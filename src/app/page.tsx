import Link from "next/link";
import { ExportGuide } from "@/components/ExportGuide";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import { HeroChat } from "@/components/HeroChat";
import { DataNotice } from "@/components/DataNotice";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-24">
        <header className="flex items-center justify-between py-5">
          <span className="font-pixel text-[15px] text-moon">Talk Recap</span>
          <nav className="flex gap-4 text-[14px] text-haze">
            <Link href="/pricing" className="hover:text-moon">
              요금
            </Link>
            <Link href="/new" className="hover:text-moon">
              대화 올리기
            </Link>
          </nav>
        </header>

        <section className="pt-6">
          <h1 className="text-[34px] leading-[1.18] font-extrabold tracking-[-0.03em] text-balance">
            단톡방을 올리면
            <br />
            누가 어떤 사람인지 다 나와요
          </h1>
          <p className="mt-4 text-[16px] leading-[1.6] text-haze">
            말버릇, 새벽에 살아나는 사람, 서로 챙기는 사이, MBTI 추론, 가방
            속까지. 모든 분석에는 실제 대화 한 줄이 근거로 붙어요.
          </p>

          <HeroChat />
          <FeatureCarousel />

          <Link
            href="/new"
            className="mt-8 flex h-14 w-full items-center justify-center rounded-[16px] bg-spark text-[17px] font-bold text-spark-ink transition active:scale-[0.99]"
          >
            대화 파일 올리기
          </Link>
          <p className="mt-3 text-center text-[13px] text-haze">
            대화 파일은 브라우저에서만 읽고, 서버에 저장하지 않아요.{" "}
            <a href="#data" className="underline underline-offset-2">
              자세히
            </a>
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">
            대화 파일은 이렇게 꺼내요
          </h2>
          <ExportGuide />
        </section>

        <section id="data" className="mt-16 scroll-mt-6">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">
            내 대화는 어디로 가나요?
          </h2>
          <div className="mt-4">
            <DataNotice />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
