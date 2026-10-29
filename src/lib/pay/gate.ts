import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { getOrder, ownsOrder, syncOrder } from "./repo";
import { isValidOrderNo } from "./order";

/** 결제 한 번으로 분석(구간 여러 개 + 재시도 + 종합)을 끝낼 수 있는 시간 */
const ANALYSIS_WINDOW_MS = 3 * 60 * 60 * 1000;

/** 서버가 결제를 강제하는지 (실거래 키를 받은 뒤 켠다) */
export const paymentEnforced = () => process.env.PAYMENT_REQUIRED === "1";

/**
 * 분석 API 결제 확인. 헤더 x-order·x-order-secret.
 * 결제 완료(paid) 주문이면 처음 쓸 때 used로 바꾸고, 그 뒤 3시간 동안 같은 주문으로 분석을 마칠 수 있다.
 * 헤더가 없으면: 결제 강제가 꺼져 있을 때만 통과.
 */
export async function checkAnalysisPayment(req: Request): Promise<Response | null> {
  const orderNo = req.headers.get("x-order");
  if (!orderNo) return paymentEnforced() ? Response.json({ error: "결제 후 분석할 수 있어요." }, { status: 402 }) : null;
  const deny = (error: string) => Response.json({ error }, { status: 402 });
  if (!isValidOrderNo(orderNo)) return deny("주문을 찾을 수 없어요.");
  let order = await getOrder(orderNo);
  if (!order || !ownsOrder(order, req.headers.get("x-order-secret"))) return deny("주문을 찾을 수 없어요.");
  if (order.status === "created") order = await syncOrder(order);
  if (order.status === "paid") {
    const db = getSupabase()!;
    await db.from("orders").update({ status: "used", used_at: new Date().toISOString() }).eq("id", order.id).eq("status", "paid");
    return null;
  }
  if (order.status === "used" && order.used_at && Date.now() - new Date(order.used_at).getTime() < ANALYSIS_WINDOW_MS) return null;
  if (order.status === "used") return deny("이미 분석에 사용한 결제예요.");
  return deny("결제가 완료되지 않았어요.");
}
