/**
 * 사업자 정보 (푸터, 약관, 개인정보처리방침에서 같이 쓴다).
 * 전자상거래법 제10조 사업자 표시, 토스페이먼츠 카드사 심사 항목에 맞춘다.
 * null인 값은 아직 받지 못한 정보다. 채우기 전까지 화면에 "준비 중"으로 보인다.
 */
export const BUSINESS = {
  serviceName: "Talk Recap",
  tradeName: "일과",
  representative: "이창협",
  registrationNumber: "436-03-02611",
  mailOrderNumber: "2022-서울송파-0417",
  taxType: "간이과세자",
  /** 사업장 주소 (사업자등록증 기준, 건물 번호까지) */
  address: "서울특별시 송파구 백제고분로19길 4-3, 602호" as string | null,
  /** 고객센터 전화 (070·대표번호·휴대폰 가능) */
  phone: "010-4533-9426" as string | null,
  /** 문의·개인정보 요청 이메일 */
  email: "orae.official@gmail.com" as string | null,
  /** 개인정보 보호책임자 */
  privacyOfficer: "이창협",
} as const;

export const POLICY_EFFECTIVE_DATE = "2026년 10월 29일";

export const pending = (v: string | null) => v ?? "준비 중";

/**
 * 유료 상품 (기간·규모로 구분). 이용약관 제9조와 결제 화면 표시에 같이 쓴다.
 * 가격은 부가세 포함 원 단위. 바꾸면 약관 변경 공지 대상이다(시행 7일 전 고지).
 */
export const PRODUCTS = [
  { id: "lite", name: "라이트 분석", price: 900, days: 100, scope: "최대 100일 기간의 대화를 AI로 분석" },
  { id: "full", name: "1년 분석", price: 1500, days: 365, scope: "최대 1년 기간의 대화를 AI로 분석" },
] as const;

export type ProductId = (typeof PRODUCTS)[number]["id"];
export const productById = (id: string) => PRODUCTS.find((p) => p.id === id) ?? null;

/** 분석할 기간(일)에 맞는 상품. 1년을 넘으면 null (기간을 줄여야 함) */
export const productForDays = (days: number) => PRODUCTS.find((p) => days <= p.days) ?? null;

/**
 * 서비스 제공 기간 (토스페이 심사: 무형 상품은 결제 후 최종 제공 완료까지 1년 이내).
 * 결제는 분석을 시작할 때 하고, 결제가 끝나면 바로 분석해 결과를 제공한다(보통 1~3분).
 * 결과 재열람·이미지 다운로드·공유 링크(재발송)는 분석일부터 RESULT_DAYS 동안 제공한다.
 */
export const SERVICE_PERIOD = {
  resultDays: 30,
  totalDays: 30,
} as const;

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 요금 표기: "900원(100일)", "1500원(1년)" */
export const periodLabel = (days: number) => (days >= 365 ? "1년" : `${days}일`);
export const priceLabel = (p: { price: number; days: number }) => `${p.price}원(${periodLabel(p.days)})`;

/** 분석 기간(일) 계산을 화면·결제에서 같은 식으로 쓴다 */
export const DAY_MS = 86_400_000;
export const spanDays = (from: number, to: number) =>
  Math.round((Math.floor(to / DAY_MS) * DAY_MS + DAY_MS - Math.floor(from / DAY_MS) * DAY_MS) / DAY_MS);
