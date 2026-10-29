import { z } from "zod";
import { getSupabase } from "@/lib/supabase/server";
import { createPayment, tossPayKey } from "@/lib/pay/tosspay";
import { newOrderNo } from "@/lib/pay/order";
import { hashToken, newDeleteToken } from "@/lib/share/token";
import { productById, BUSINESS } from "@/lib/legal/business";

const err = (error: string, status: number) => Response.json({ error }, { status });

const body = z.object({ plan: z.enum(["lite", "full"]), agreed: z.literal(true) });

/** 주문을 만들고 토스페이 결제창 주소를 돌려준다. 주문 비밀값은 이 응답에서 한 번만 준다 */
export async function POST(req: Request) {
  const db = getSupabase();
  if (!db || !tossPayKey()) return err("결제 기능이 아직 설정되지 않았어요.", 503);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("상품을 고르고 주문 내용에 동의해 주세요.", 400);
  const product = productById(parsed.data.plan)!;

  const orderNo = newOrderNo();
  const secret = newDeleteToken();
  const ins = await db.from("orders").insert({ id: orderNo, plan: product.id, amount: product.price, owner_token_hash: hashToken(secret) });
  if (ins.error) {
    console.error(`[pay] order insert failed: ${ins.error.code}`);
    return err("주문을 만들지 못했어요. 잠시 후 다시 시도해 주세요.", 500);
  }

  const origin = new URL(req.url).origin;
  // 토스페이는 콜백 주소로 localhost를 받지 않는다. 로컬 개발 때는 배포 주소로 콜백을 받는다
  const callbackOrigin = /localhost|127\.0\.0\.1/.test(origin) ? (process.env.PAY_CALLBACK_ORIGIN ?? "https://talk-recap.vercel.app") : origin;
  const r = await createPayment({
    orderNo,
    amount: product.price,
    productDesc: `${BUSINESS.serviceName} ${product.name}`,
    retUrl: `${origin}/pay/complete?order=${orderNo}`,
    retCancelUrl: `${origin}/pay/cancel?order=${orderNo}`,
    resultCallback: `${callbackOrigin}/api/pay/callback`,
  });
  if (!r.ok) {
    console.error(`[pay] create failed: ${r.msg}`);
    await db.from("orders").update({ status: "canceled" }).eq("id", orderNo);
    return err("결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요.", 502);
  }
  await db.from("orders").update({ pay_token: r.payToken }).eq("id", orderNo);
  return Response.json({ orderNo, secret, checkoutPage: r.checkoutPage }, { status: 201 });
}
