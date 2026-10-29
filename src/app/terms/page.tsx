import type { Metadata } from "next";
import Link from "next/link";
import { Article, LegalDoc, List } from "@/components/legal/LegalDoc";
import { BUSINESS, POLICY_EFFECTIVE_DATE, PRODUCTS, SERVICE_PERIOD, pending, priceLabel } from "@/lib/legal/business";

export const metadata: Metadata = { title: "이용약관 · Talk Recap" };

/**
 * 이용약관. 공정위 전자상거래 표준약관 구성을 참고하되, 회원가입 없는 디지털 콘텐츠(분석 결과) 서비스에 맞췄다.
 * 환불 조항(#refund)은 토스페이먼츠 카드사 심사에서 보는 환불 정책이다. 상품·가격은 business.ts PRODUCTS.
 */
export default function TermsPage() {
  const b = BUSINESS;
  return (
    <LegalDoc title="이용약관" effective={POLICY_EFFECTIVE_DATE}>
      <Article title="제1조 (목적)">
        <p>
          이 약관은 {b.tradeName}(이하 &lsquo;회사&rsquo;)가 제공하는 {b.serviceName}(이하 &lsquo;서비스&rsquo;)의 이용 조건과 절차, 회사와 이용자의 권리·의무를
          정합니다.
        </p>
      </Article>

      <Article title="제2조 (정의)">
        <List
          items={[
            "'이용자'란 이 약관에 따라 서비스를 이용하는 사람을 말합니다. 서비스는 회원가입 없이 이용합니다.",
            "'대화 파일'이란 이용자가 카카오톡에서 내보내기 한 대화 기록 파일을 말합니다.",
            "'분석 결과'란 대화 파일을 바탕으로 서비스가 만든 통계, AI 리포트, 카드, 퀴즈 등을 말합니다.",
            "'공유 링크'란 이용자의 요청으로 분석 결과를 서버에 저장하고 다른 사람이 볼 수 있게 만든 주소를 말합니다.",
            "'유료 서비스'란 회사가 대가를 받고 제공하는 분석·기능을 말합니다.",
          ]}
        />
      </Article>

      <Article title="제3조 (약관의 게시와 변경)">
        <List
          items={[
            "회사는 이 약관을 서비스 화면 하단에 게시합니다.",
            "회사는 관련 법령을 어기지 않는 범위에서 약관을 바꿀 수 있습니다. 바꿀 때는 시행일과 사유를 시행 7일 전(이용자에게 불리한 변경은 30일 전)부터 서비스 화면에 알립니다.",
            "변경된 약관에 동의하지 않으면 서비스 이용을 중단할 수 있습니다. 시행일 이후에도 계속 이용하면 변경에 동의한 것으로 봅니다.",
          ]}
        />
      </Article>

      <Article title="제4조 (서비스의 내용)">
        <List
          items={[
            "대화 파일 분석: 파일은 이용자 브라우저에서 읽고, 숫자 통계를 계산합니다.",
            "AI 분석: 이용자가 시작하면 대화 일부를 가린 뒤 AI 위탁사에 보내 리포트를 만듭니다.",
            "결과 보기: 스토리 슬라이드, 리포트, 멤버·가방 카드, 이미지 저장",
            "공유 링크: 결과를 30일 동안 저장하고 링크로 공유, 퀴즈·반박·투표",
          ]}
        />
        <p>
          개인정보 처리에 관한 자세한 내용은 <Link href="/privacy" className="font-bold underline">개인정보처리방침</Link>을 따릅니다.
        </p>
      </Article>

      <Article title="제5조 (이용자의 의무)">
        <List
          items={[
            "대화 파일에는 다른 참여자의 대화와 이름이 들어 있습니다. 이용자는 분석 전에 대화 참여자에게 알리고 동의를 받아야 하며, 그 책임은 이용자에게 있습니다.",
            "이용자는 본인이 참여하지 않았거나 정당한 권한이 없는 대화를 올려서는 안 됩니다.",
            "분석 결과를 특정인을 비방·모욕하거나 사생활을 침해하는 데 쓰거나, 동의 없이 불특정 다수에게 공개해서는 안 됩니다.",
            "서비스를 비정상적으로 이용(자동화된 대량 요청, 보안 우회, 타인의 공유 링크 무단 수집 등)해서는 안 됩니다.",
            "이를 어겨 생긴 분쟁과 손해는 이용자가 책임집니다. 회사는 위반이 확인되면 해당 공유 링크를 삭제하거나 이용을 제한할 수 있습니다.",
          ]}
        />
      </Article>

      <Article title="제6조 (분석 결과의 성격)">
        <List
          items={[
            "AI 리포트, 성격·아키타입, MBTI, 궁합, 가방 등은 대화를 바탕으로 추론한 재미용 콘텐츠이며, 사실이나 전문적 판단을 보증하지 않습니다.",
            "AI 특성상 결과에 오류나 사실과 다른 표현이 있을 수 있습니다. 회사는 원문에 없는 인용을 걸러내는 등 정확성을 높이려 노력하지만 완전성을 보증하지 않습니다.",
            "분석 결과를 근거로 한 판단과 행동의 책임은 이용자에게 있습니다.",
          ]}
        />
      </Article>

      <Article title="제7조 (권리의 귀속)">
        <List
          items={[
            "대화 파일과 대화 내용에 대한 권리는 대화 참여자에게 있습니다.",
            "서비스의 화면 디자인, 아이콘, 소프트웨어 등에 대한 권리는 회사에 있습니다.",
            "이용자는 분석 결과와 저장한 이미지를 개인적·비상업적 목적으로 자유롭게 쓸 수 있습니다.",
          ]}
        />
      </Article>

      <Article title="제8조 (공유 링크)">
        <List
          items={[
            "공유 링크는 생성일로부터 30일 동안 유지되고 이후 자동 삭제됩니다.",
            "링크 주소를 아는 사람은 누구나 결과를 볼 수 있습니다. 링크를 어디에 보낼지는 이용자가 판단합니다.",
            "링크를 만든 브라우저에서 언제든 '공유 중지'로 삭제할 수 있습니다. 결과에 등장하는 대화 참여자도 회사에 삭제를 요청할 수 있습니다.",
          ]}
        />
      </Article>

      <Article id="refund" title="제9조 (유료 서비스, 결제, 청약철회·환불)">
        <p>유료 서비스는 분석 1회 단위로 판매하며, 분석할 대화의 기간에 따라 두 가지가 있습니다. 가격은 부가가치세를 포함합니다.</p>
        <div className="overflow-x-auto rounded-[14px] bg-dusk">
          <table className="w-full border-collapse text-left text-[13px] leading-[1.6]">
            <thead>
              <tr>
                <th className="border-b border-dusk-2 px-3 py-2 font-semibold text-haze">상품</th>
                <th className="border-b border-dusk-2 px-3 py-2 font-semibold text-haze">가격</th>
                <th className="border-b border-dusk-2 px-3 py-2 font-semibold text-haze">내용</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="border-b border-dusk-2 px-3 py-2 font-semibold">{p.name}</td>
                  <td className="tabular border-b border-dusk-2 px-3 py-2">{priceLabel(p)}</td>
                  <td className="border-b border-dusk-2 px-3 py-2">{p.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <List
          items={[
            "두 상품 모두 같은 결과(AI 리포트, 스토리, 카드, 공유 링크·퀴즈·반박)를 제공하며, 분석하는 대화의 기간만 다릅니다. 대화 파일 업로드와 숫자 통계 미리보기는 무료입니다.",
            "대화가 상품의 최대 기간보다 길면, 분석할 기간(100일 또는 1년)을 업로드 화면에서 직접 고릅니다.",
            `결제와 제공: 유료 서비스는 이용자가 분석을 시작할 때 결제하며, 결제가 완료되면 즉시 분석해 결과를 제공합니다(보통 1~3분). 결과의 재열람·이미지 다운로드·공유 링크(재발송)는 분석일부터 ${SERVICE_PERIOD.resultDays}일 동안 제공합니다. 따라서 결제 후 최종 제공 완료까지의 기간은 최대 ${SERVICE_PERIOD.totalDays}일(1년 이내)입니다.`,
            "분석할 기간이 100일 이하이면 라이트 분석, 100일 초과 1년 이하이면 1년 분석 가격이 적용되며, 1년을 넘는 기간은 분석할 수 없습니다.",
            "결제 1회로 분석 1회를 이용할 수 있습니다. 같은 대화를 다시 분석하거나 기간을 바꿔 분석하려면 다시 결제해야 합니다.",
            "상품 내용, 가격, 제공 방법, 청약철회 제한 사실은 결제 전 화면에 표시합니다. 결제는 (주)토스페이먼츠의 결제 서비스를 통해 이루어집니다.",
            "유료 서비스는 결제 완료 즉시 분석과 제공이 시작되는 디지털 콘텐츠입니다. 결제 후 분석이 시작되지 않은 경우에는 결제일로부터 7일 이내에 청약을 철회할 수 있으나, AI 분석이 시작되어 결과 제공이 개시된 경우에는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제5호에 따라 청약철회가 제한됩니다. 회사는 결제 전에 이 사실을 표시합니다.",
            "다음의 경우에는 전액 환불합니다: 결제 후 분석이 시작되지 않은 경우, 서비스 장애나 오류로 분석 결과를 받지 못한 경우, 결제가 중복된 경우.",
            "분석 결과가 일부만 제공되었거나 내용이 표시·광고와 현저히 다른 경우에는 결과를 확인한 날부터 3개월 이내(그 사실을 안 날부터 30일 이내)에 환불을 요청할 수 있습니다.",
            "환불은 요청을 확인한 날부터 3영업일 이내에 결제 수단과 같은 방법으로 처리합니다. 카드 결제는 카드사 사정에 따라 취소 반영이 늦어질 수 있습니다.",
            `환불 요청: ${pending(b.email)} (주문번호, 결제 일시를 함께 보내 주세요)`,
          ]}
        />
        <p>
          상황별 환불 기준과 신청 방법은 <Link href="/refund" className="underline">환불 정책</Link>에 자세히 적었습니다.
        </p>
      </Article>

      <Article title="제10조 (서비스의 변경·중단)">
        <List
          items={[
            "회사는 운영·기술상 필요에 따라 서비스 내용을 바꿀 수 있으며, 중요한 변경은 미리 알립니다.",
            "설비 점검, 장애, 외부 위탁사(AI, 호스팅, 데이터베이스)의 서비스 중단 등 부득이한 사유로 서비스가 일시 중단될 수 있습니다.",
            "회사가 서비스를 종료할 때는 30일 전에 알리고, 유료 서비스의 제공되지 않은 부분은 환불합니다.",
          ]}
        />
      </Article>

      <Article title="제11조 (책임의 제한)">
        <List
          items={[
            "회사는 천재지변, 위탁사의 장애 등 회사의 고의·과실 없는 사유로 인한 손해에 대해 책임지지 않습니다.",
            "회사는 이용자가 올린 대화 내용, 이용자 간 또는 이용자와 대화 참여자 사이의 분쟁에 대해 책임지지 않습니다. 다만 회사의 고의 또는 중대한 과실이 있는 경우는 예외로 합니다.",
            "무료로 제공되는 서비스에 대해서는 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.",
          ]}
        />
      </Article>

      <Article title="제12조 (분쟁 해결과 관할)">
        <List
          items={[
            "회사는 이용자의 불만과 피해 구제 요청을 우선 처리합니다. 문의: " + pending(b.email),
            "분쟁이 생기면 이용자는 한국소비자원, 전자거래분쟁조정위원회 등에 조정을 신청할 수 있습니다.",
            "이 약관은 대한민국 법률을 따르며, 소송은 민사소송법상 관할 법원에 제기합니다.",
          ]}
        />
      </Article>

      <Article title="부칙">
        <p>이 약관은 {POLICY_EFFECTIVE_DATE}부터 시행합니다.</p>
        <p className="text-[13px] text-haze">
          사업자: {b.tradeName} · 대표 {b.representative} · 사업자등록번호 {b.registrationNumber} · 통신판매업 신고 {b.mailOrderNumber}
        </p>
      </Article>
    </LegalDoc>
  );
}
