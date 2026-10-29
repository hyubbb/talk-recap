import Link from "next/link";
import { BUSINESS, pending } from "@/lib/legal/business";

/** 사업자 정보 푸터 (전자상거래법 사업자 표시). 모든 화면 하단 */
export function SiteFooter() {
  const b = BUSINESS;
  return (
    <footer className="mx-auto w-full max-w-[560px] border-t border-dusk-2 px-5 pt-6 pb-10 text-[12px] leading-[1.7] text-haze">
      <nav className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        <Link href="/terms" className="hover:text-moon">
          이용약관
        </Link>
        <Link href="/privacy" className="font-bold text-moon">
          개인정보처리방침
        </Link>
        <Link href="/refund" className="hover:text-moon">
          환불 정책
        </Link>
      </nav>
      <p>
        상호 {b.tradeName} · 대표 {b.representative} · 사업자등록번호 {b.registrationNumber}
      </p>
      <p>통신판매업 신고 {b.mailOrderNumber}</p>
      <p>주소 {pending(b.address)}</p>
      <p>
        고객센터 {pending(b.phone)} · 이메일 {pending(b.email)}
      </p>
      <p className="mt-2">© {b.tradeName}. {b.serviceName}</p>
    </footer>
  );
}
