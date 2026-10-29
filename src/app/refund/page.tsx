import type { Metadata } from "next";
import Link from "next/link";
import { Article, LegalDoc, List, Table } from "@/components/legal/LegalDoc";
import {
  BUSINESS,
  POLICY_EFFECTIVE_DATE,
  PRODUCTS,
  SERVICE_PERIOD,
  priceLabel,
} from "@/lib/legal/business";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "환불 정책 · Talk Recap" };

/**
 * 환불 정책. 토스페이먼츠 카드사 심사의 "비실물 상품 제공기간·환불정책" 항목.
 * 이용약관 제9조와 같은 기준을 풀어 쓴 것이므로, 바꿀 때 두 곳을 함께 고친다.
 */
export default function RefundPage() {
  const b = BUSINESS;
  return (
    <>
      <LegalDoc title="환불 정책" effective={POLICY_EFFECTIVE_DATE}>
        <p>
          {b.serviceName}의 유료 서비스는 결제 후 바로 AI 분석이 진행되는 디지털
          콘텐츠입니다. 아래 기준에 따라 청약철회와 환불을 처리합니다. 이 정책은{" "}
          <Link href="/terms#refund" className="underline">
            이용약관 제9조
          </Link>
          를 자세히 풀어 쓴 것입니다.
        </p>

        <Article title="1. 판매 상품">
          <Table
            head={["상품", "가격(부가세 포함)", "내용", "제공 시점"]}
            rows={PRODUCTS.map((p) => [
              p.name,
              priceLabel(p),
              p.scope,
              "분석을 시작할 때 결제, 결제 즉시 분석해 보통 1~3분 안에 결과 제공",
            ])}
          />
          <p className="text-[13px] text-haze">
            대화 파일 업로드와 숫자 통계 미리보기는 무료이며, 결제 1회로 분석
            1회를 이용할 수 있습니다. 가격은 업로드 화면에서 고른 분석 기간으로
            정해집니다(100일 이하 라이트, 1년 이하 1년 분석).
          </p>
        </Article>

        <Article title="2. 서비스 제공 기간 (재열람·다운로드·재발송)">
          <Table
            head={["구분", "기간"]}
            rows={[
              ["결제 시점", "분석을 시작할 때 (미리 사 두는 이용권 없음)"],
              ["분석 결과 제공", "결제 완료 즉시 (보통 1~3분)"],
              [
                "결과 재열람·이미지(PNG) 다운로드",
                `분석일부터 ${SERVICE_PERIOD.resultDays}일`,
              ],
              [
                "공유 링크(결과 재발송)",
                `분석일부터 ${SERVICE_PERIOD.resultDays}일, 이후 자동 삭제`,
              ],
              [
                "결제 후 최종 제공 완료까지",
                `최대 ${SERVICE_PERIOD.totalDays}일 (1년 이내)`,
              ],
            ]}
          />
        </Article>

        <Article title="3. 환불 기준">
          <Table
            head={["상황", "환불"]}
            rows={[
              [
                "결제는 됐는데 분석이 시작되지 않은 경우 (결제일로부터 7일 이내)",
                "전액 환불",
              ],
              [
                "서비스 장애·오류로 분석이 실패해 결과를 받지 못한 경우",
                "전액 환불 (기간 제한 없음)",
              ],
              ["같은 분석에 결제가 중복된 경우", "중복 결제분 전액 환불"],
              [
                "결과가 일부만 제공되었거나 상품 설명과 현저히 다른 경우",
                "확인 후 전액 또는 일부 환불 (결과 제공일부터 3개월, 그 사실을 안 날부터 30일 이내 요청)",
              ],
              [
                "분석이 정상적으로 끝나 결과를 받은 경우",
                "환불 불가 (아래 4번)",
              ],
              [
                "단순 변심, 결과 내용(AI 해석)이 마음에 들지 않는 경우",
                "환불 불가",
              ],
            ]}
          />
        </Article>

        <Article title="4. 청약철회가 제한되는 경우">
          <p>
            AI 분석이 시작되어 결과 제공이 개시되면 「전자상거래 등에서의
            소비자보호에 관한 법률」 제17조 제2항 제5호(디지털 콘텐츠의 제공이
            개시된 경우)에 따라 청약철회가 제한됩니다. 회사는 결제 화면에서 이
            사실을 미리 알리고, 결제 전에 무료 통계 미리보기로 분석될 대화를
            확인할 수 있게 합니다.
          </p>
          <p>
            AI 분석 결과는 대화를 바탕으로 추론한 재미용 콘텐츠이므로, 해석에
            대한 이견은 환불 사유가 되지 않습니다.
          </p>
        </Article>

        <Article title="5. 환불 신청 방법">
          <List
            items={[
              `이메일: ${b.email}`,
              `전화: ${b.phone}`,
              "보내 주실 내용: 결제 일시, 결제 금액, 주문번호(결제 완료 화면·카드 승인 문자), 환불 사유",
              "회원가입이 없는 서비스라 결제 정보로 본인 결제 여부를 확인합니다.",
            ]}
          />
        </Article>

        <Article title="6. 환불 처리 기간과 방법">
          <List
            items={[
              "환불이 확인되면 3영업일 이내에 결제한 수단으로 취소합니다.",
              "신용·체크카드: 카드사에 따라 취소 반영까지 3~7영업일이 더 걸릴 수 있습니다.",
              "간편결제·계좌이체 등 다른 결제 수단은 해당 결제사의 환불 절차를 따릅니다.",
              "회사 사정으로 환불이 늦어지면 지연 기간에 대해 관련 법령에 따른 지연 배상금을 지급합니다.",
            ]}
          />
        </Article>

        <Article title="7. 분쟁 해결">
          <p>
            환불에 대한 불만은 위 연락처로 먼저 알려 주세요. 해결되지 않으면
            한국소비자원(국번없이 1372, www.kca.go.kr),
            전자거래분쟁조정위원회(www.ecmc.or.kr)에 상담·조정을 신청할 수
            있습니다.
          </p>
          <p className="text-[13px] text-haze">
            사업자: {b.tradeName} · 대표 {b.representative} · 사업자등록번호{" "}
            {b.registrationNumber} · 통신판매업 신고 {b.mailOrderNumber}
          </p>
        </Article>
      </LegalDoc>
      <SiteFooter />
    </>
  );
}
