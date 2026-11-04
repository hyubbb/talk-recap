import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { getOrder, ownsOrder, syncOrder } from "./repo";
import { isValidOrderNo } from "./order";
import { BUDGET_ERRORS, budgetFor } from "./usage";
import { DAY_MS } from "@/lib/legal/business";

/** 결제 한 번으로 분석(구간 여러 개 + 재시도 + 종합)을 끝낼 수 있는 시간 */
const ANALYSIS_WINDOW_MS = 3 * 60 * 60 * 1000;

/** 서버가 결제를 강제하는지 (실거래 키를 받은 뒤 켠다) */
export const paymentEnforced = () => process.env.PAYMENT_REQUIRED === "1";

/** 이번 요청이 쓰는 양: 구간 분석은 원문 바이트와 날짜, 종합은 1회 */
export type AnalysisUse = { kind: "chunk"; bytes: number; start: number; end: number } | { kind: "synth" };

/**
 * 분석 API 결제 확인. 헤더 x-order·x-order-secret.
 * 결제 완료(paid) 주문이면 처음 쓸 때 used로 바꾸고, 그 뒤 3시간 동안 같은 주문으로 분석을 마칠 수 있다.
 * 그 안에서도 주문마다 원문 바이트·종합 횟수·대화 기간 한도(usage.ts)를 넘으면 거절한다.
 * 헤더가 없으면: 결제 강제가 꺼져 있을 때만 통과.
 */
export async function checkAnalysisPayment(req: Request, use: AnalysisUse): Promise<Response | null> {
  const orderNo = req.headers.get("x-order");
  if (!orderNo) return paymentEnforced() ? Response.json({ error: "결제 후 분석할 수 있어요." }, { status: 402 }) : null;
  const deny = (error: string) => Response.json({ error }, { status: 402 });
  if (!isValidOrderNo(orderNo)) return deny("주문을 찾을 수 없어요.");
  let order = await getOrder(orderNo);
  if (!order || !ownsOrder(order, req.headers.get("x-order-secret"))) return deny("주문을 찾을 수 없어요.");
  if (order.status === "created") order = await syncOrder(order);

  const db = getSupabase()!;
  if (order.status === "paid") {
    await db.from("orders").update({ status: "used", used_at: new Date().toISOString() }).eq("id", order.id).eq("status", "paid");
  } else if (order.status === "used") {
    if (!order.used_at || Date.now() - new Date(order.used_at).getTime() >= ANALYSIS_WINDOW_MS) return deny("이미 분석에 사용한 결제예요.");
  } else {
    return deny("결제가 완료되지 않았어요.");
  }

  const budget = budgetFor(order.plan);
  if (!budget) return deny("주문을 찾을 수 없어요.");
  const day = (ts: number) => Math.floor(ts / DAY_MS) * DAY_MS;
  const { data, error } = await db.rpc("consume_order", {
    p_id: order.id,
    p_kind: use.kind,
    p_bytes: use.kind === "chunk" ? use.bytes : 0,
    p_from: use.kind === "chunk" ? day(use.start) : 0,
    p_to: use.kind === "chunk" ? day(use.end) : 0,
    p_max_bytes: budget.maxBytes,
    p_max_synth: budget.maxSynth,
    p_max_span: budget.maxSpan,
  });
  if (error) {
    // 0005_order_usage.sql을 안 돌렸으면 여기로 온다. 한도를 못 세면 분석하지 않는다
    console.error(`[pay] consume_order failed: ${error.code}`);
    return Response.json({ error: "결제 확인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
  if (data !== "ok") {
    console.warn(`[pay] budget ${data} ${order.id}`);
    return deny(BUDGET_ERRORS[String(data)] ?? "결제를 확인하지 못했어요.");
  }
  return null;
}
