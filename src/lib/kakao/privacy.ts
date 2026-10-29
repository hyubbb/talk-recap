/**
 * LLM으로 보내기 전에 브라우저에서 가리는 민감정보.
 * 완벽한 탐지가 아니라 흔한 패턴을 줄이는 1차 방어선이다.
 */
const RULES: { name: string; re: RegExp; mask: string }[] = [
  { name: "rrn", re: /\b\d{6}[- ]?[1-4]\d{6}\b/g, mask: "[주민번호]" },
  { name: "card", re: /\b(?:\d{4}[- ]?){3}\d{4}\b/g, mask: "[카드번호]" },
  { name: "phone", re: /\b01[016789][- .]?\d{3,4}[- .]?\d{4}\b/g, mask: "[전화번호]" },
  { name: "email", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, mask: "[이메일]" },
  // 은행명 근처 숫자 또는 하이픈이 섞인 10~16자리 숫자
  {
    name: "account",
    re: /(?:(?:국민|신한|우리|하나|농협|기업|카카오뱅크|케이뱅크|토스뱅크|새마을|우체국|SC|씨티|수협|신협|부산|대구|경남|광주|전북|제주)\s*(?:은행)?\s*:?\s*)?\b\d{2,6}-\d{2,6}-\d{2,8}(?:-\d{1,4})?\b|(?:국민|신한|우리|하나|농협|기업|카카오뱅크|케이뱅크|토스뱅크|새마을|우체국)\s*(?:은행)?\s*:?\s*\d{10,16}/g,
    mask: "[계좌번호]",
  },
];

export function maskSensitive(text: string): { text: string; hits: number } {
  let hits = 0;
  let out = text;
  for (const r of RULES) {
    out = out.replace(r.re, () => {
      hits++;
      return r.mask;
    });
  }
  return { text: out, hits };
}
