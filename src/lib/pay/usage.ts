import { DAY_MS, productById } from "../legal/business";

/**
 * 결제 한 건으로 쓸 수 있는 AI 분석량. 서버(gate.ts)가 주문마다 센다.
 * 화면대로 쓰면 닿지 않을 만큼 넉넉하게, API를 직접 두드려도 비용이 끝없이 나가지 않게.
 */

/** 하루치 대화 원문 상한 (바이트). 하루 1,300개쯤 오가는 아주 시끄러운 방 기준, 재시도 여유 포함 */
export const BYTES_PER_DAY = 80_000;
/** 구간 하나의 원문 상한. 브라우저가 350KB로 자르니 조금 여유 */
export const MAX_CHUNK_BYTES = 400_000;
/** 종합 호출 횟수 (실패 후 다시 시도 포함) */
export const MAX_SYNTH_CALLS = 4;

export interface OrderBudget {
  maxBytes: number;
  maxSynth: number;
  /** 가장 이른 구간의 날짜와 가장 늦은 구간의 날짜 차이 상한 (ms) */
  maxSpan: number;
}

export function budgetFor(plan: string): OrderBudget | null {
  const p = productById(plan);
  if (!p) return null;
  return { maxBytes: p.days * BYTES_PER_DAY, maxSynth: MAX_SYNTH_CALLS, maxSpan: (p.days - 1) * DAY_MS };
}

const dayOf = (ts: number) => Math.floor(ts / DAY_MS) * DAY_MS;
const LINE = /^(\d{1,2})\/(\d{1,2}) \d{2}:\d{2} /;

/**
 * 구간 원문("M/D HH:MM 이름: 내용")의 날짜가 알려 준 기간(start~end) 안에서 차례대로 가는지.
 * 원문에는 연도가 없어서, 기간 안에 들어가는 날짜 중 앞 줄보다 늦은 가장 이른 날로 읽는다.
 * 첫 줄은 start 날짜, 마지막 줄은 end 날짜여야 한다. 기간을 속여 더 긴 대화를 보내는 걸 막는다.
 */
export function chunkDatesOk(text: string, start: number, end: number): boolean {
  if (!(end >= start)) return false;
  const from = dayOf(start);
  const to = dayOf(end);
  const y0 = new Date(from).getUTCFullYear();
  const y1 = new Date(to).getUTCFullYear();
  let last = -Infinity;
  let first: number | null = null;
  for (const line of text.split("\n")) {
    const m = LINE.exec(line);
    if (!m) continue;
    const month = Number(m[1]) - 1;
    const date = Number(m[2]);
    let day: number | null = null;
    for (let y = y0; y <= y1 && day === null; y++) {
      const d = Date.UTC(y, month, date);
      if (new Date(d).getUTCDate() !== date) continue;
      if (d >= from && d <= to && d >= last) day = d;
    }
    if (day === null) return false;
    first ??= day;
    last = day;
  }
  return first === from && last === to;
}

/** 주문 사용량 확인 결과 → 화면에 보여줄 말 */
export const BUDGET_ERRORS: Record<string, string> = {
  bytes: "결제한 분석량을 넘었어요. 기간을 줄여서 다시 분석해 주세요.",
  span: "결제한 기간보다 긴 대화예요. 기간을 줄여 주세요.",
  synth: "이 결제로 할 수 있는 분석 횟수를 다 썼어요.",
  missing: "주문을 찾을 수 없어요.",
};
