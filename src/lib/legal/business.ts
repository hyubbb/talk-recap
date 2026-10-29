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
  { id: "lite", name: "라이트 분석", price: 500, scope: "최근 30일 이내 기간의 대화를 AI로 분석" },
  { id: "full", name: "전체 분석", price: 1500, scope: "기간 제한 없이 올린 대화 전체를 AI로 분석" },
] as const;

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
