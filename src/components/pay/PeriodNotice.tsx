import { SERVICE_PERIOD } from "@/lib/legal/business";

/** 서비스 제공 기간 안내 (토스페이 심사: 무형 상품 제공 주기 1년 이내 명시) */
export function PeriodNotice({ className = "" }: { className?: string }) {
  const p = SERVICE_PERIOD;
  return (
    <ul className={`flex list-disc flex-col gap-1 pl-5 text-[13px] leading-[1.6] text-haze ${className}`}>
      <li>이용권 사용 기한: 결제일부터 {p.useDays}일 안에 분석을 시작해야 해요.</li>
      <li>결과 제공: 분석을 시작하면 보통 1~3분 안에 바로 제공돼요.</li>
      <li>
        재열람·이미지 다운로드·공유 링크(재발송) 기간: 분석일부터 {p.resultDays}일.
      </li>
      <li>결제 후 최종 제공 완료까지 최대 {p.totalDays}일이에요.</li>
    </ul>
  );
}
