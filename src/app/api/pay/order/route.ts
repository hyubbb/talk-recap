import { getOrder, ownsOrder, publicOrder, syncOrder } from "@/lib/pay/repo";
import { isValidOrderNo } from "@/lib/pay/order";

const err = (error: string, status: number) => Response.json({ error }, { status });

/** 내 주문 상태 (헤더 x-order-secret). 아직 결제 대기면 토스페이 상태를 다시 확인한다 */
export async function GET(req: Request) {
  const orderNo = new URL(req.url).searchParams.get("order") ?? "";
  if (!isValidOrderNo(orderNo)) return err("주문을 찾을 수 없어요.", 404);
  const order = await getOrder(orderNo);
  if (!order || !ownsOrder(order, req.headers.get("x-order-secret"))) return err("주문을 찾을 수 없어요.", 404);
  const synced = await syncOrder(order);
  return Response.json({ order: publicOrder(synced) }, { headers: { "cache-control": "no-store" } });
}
