import { getOrder, syncOrder } from "@/lib/pay/repo";
import { isValidOrderNo } from "@/lib/pay/order";

/**
 * 토스페이 결제 결과 콜백(V2, autoExecute). 본문은 신호로만 쓰고 상태 확인 API로 검증한다.
 * 토스는 200 응답을 받아야 재전송하지 않는다.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { orderNo?: string } | null;
  const orderNo = b?.orderNo ?? "";
  if (isValidOrderNo(orderNo)) {
    const order = await getOrder(orderNo);
    if (order) await syncOrder(order);
  }
  return new Response("OK", { status: 200 });
}
