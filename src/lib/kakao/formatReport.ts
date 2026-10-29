import { maskSensitive } from "./privacy";

/** 해석 못 한 줄 비율이 이 값을 넘으면 /new에 "형식 제보" 안내를 띄운다 */
export const UNPARSED_REPORT_RATIO = 0.01;

export function needsFormatReport(unparsedLines: number, messageCount: number): boolean {
  const total = unparsedLines + messageCount;
  return total > 0 && unparsedLines / total > UNPARSED_REPORT_RATIO;
}

/**
 * 문제 줄을 제보용으로 가린다. 이름(긴 것부터)은 ○○, 숫자 외 글자는 형태만 남긴다.
 * 형식(날짜·구분자·대괄호)은 그대로 두어야 파서를 고칠 수 있다.
 */
export function maskSampleLine(line: string, names: string[]): string {
  let out = maskSensitive(line).text;
  for (const n of [...names].filter(Boolean).sort((a, b) => b.length - a.length)) {
    out = out.split(n).join("○○");
  }
  // 대화 내용(한글·영문 단어)은 글자 수만 남긴다. 날짜·시간·구분 기호와 형식 단어는 보존
  const KEEP = /^(오전|오후|AM|PM|년|월|일|요일|at|저장한|날짜)$/;
  return out.replace(/[가-힣A-Za-z]+/g, (w) => (KEEP.test(w) || /요일$/.test(w) || /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(w) ? w : "■".repeat(Math.min(w.length, 6))));
}
