import { z } from "zod";
import { getSupabase } from "@/lib/supabase/server";
import { getOrder, ownsOrder, publicOrder } from "@/lib/pay/repo";
import { isValidOrderNo } from "@/lib/pay/order";
import { productById } from "@/lib/legal/business";

const err = (error: string, status: number) => Response.json({ error }, { status });

const body = z.object({ orderNo: z.string(), secret: z.string().min(1).max(200), days: z.number().int().min(1).max(4000) });

/** 분석 시작 시 이용권 사용 처리. 기간이 상품 한도를 넘거나 기한이 지나면 거절 */
export async function POST(req: Request) {
  const db = getSupabase();
  if (!db) return err("결제 기능이 아직 설정되지 않았어요.", 503);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isValidOrderNo(parsed.data.orderNo)) return err("요청 형식이 올바르지 않아요.", 400);
  const order = await getOrder(parsed.data.orderNo);
  if (!order || !ownsOrder(order, parsed.data.secret)) return err("이용권을 찾을 수 없어요.", 404);
  if (order.status === "used") return err("이미 사용한 이용권이에요.", 409);
  if (order.status !== "paid") return err("결제가 완료된 이용권이 아니에요.", 402);
  if (order.use_expires_at && new Date(order.use_expires_at) < new Date()) return err("이용권 사용 기한(결제일부터 30일)이 지났어요.", 410);
  const product = productById(order.plan)!;
  if (parsed.data.days > product.days) return err(`${product.name}은 최대 ${product.days}일까지 분석할 수 있어요. 기간을 줄여 주세요.`, 422);

  const { data, error } = await db
    .from("orders")
    .update({ status: "used", used_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("status", "paid")
    .select("id, plan, amount, status, pay_method, mode, owner_token_hash, created_at, paid_at, used_at, use_expires_at")
    .maybeSingle();
  if (error || !data) return err("이용권을 사용하지 못했어요. 다시 시도해 주세요.", 409);
  return Response.json({ order: publicOrder(data as never) });
}
