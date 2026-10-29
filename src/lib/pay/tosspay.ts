import "server-only";

/**
 * 토스페이 온라인 결제 (직접 계약). https://docs-pay.toss.im
 * API Key는 서버 환경변수 TOSSPAY_API_KEY에만 둔다. sk_test_ 는 금원 이동 없는 테스트, sk_live_ 는 실거래.
 */
const BASE = "https://pay.toss.im/api/v2";

export function tossPayKey(): string | null {
  return process.env.TOSSPAY_API_KEY || null;
}

export function tossPayMode(): "TEST" | "LIVE" | null {
  const k = tossPayKey();
  if (!k) return null;
  return k.startsWith("sk_live_") ? "LIVE" : "TEST";
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ apiKey: tossPayKey(), ...body }),
    cache: "no-store",
  });
  return (await res.json()) as T;
}

export async function createPayment(input: {
  orderNo: string;
  amount: number;
  productDesc: string;
  retUrl: string;
  retCancelUrl: string;
  resultCallback: string;
}): Promise<{ ok: true; payToken: string; checkoutPage: string } | { ok: false; msg: string }> {
  const r = await post<{ code: number; payToken?: string; checkoutPage?: string; msg?: string; errorCode?: string }>("/payments", {
    orderNo: input.orderNo,
    amount: input.amount,
    amountTaxFree: 0,
    productDesc: input.productDesc,
    autoExecute: true,
    callbackVersion: "V2",
    resultCallback: input.resultCallback,
    retUrl: input.retUrl,
    retCancelUrl: input.retCancelUrl,
  });
  if (r.code === 0 && r.payToken && r.checkoutPage) return { ok: true, payToken: r.payToken, checkoutPage: r.checkoutPage };
  return { ok: false, msg: r.msg ?? r.errorCode ?? "결제를 만들지 못했어요." };
}

export interface PaymentStatus {
  mode: "TEST" | "LIVE";
  orderNo: string;
  payStatus: string;
  payMethod?: string;
  amount: number;
}

/** 결제 상태 확인. retUrl·콜백 본문을 믿지 않고 이 API로 최종 확인한다 */
export async function paymentStatus(orderNo: string): Promise<PaymentStatus | null> {
  const r = await post<PaymentStatus & { code: number }>("/status", { orderNo });
  return r.code === 0 ? r : null;
}
