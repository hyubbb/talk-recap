import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/share/token";
import { paymentStatus } from "./tosspay";
import { statusFromToss, ticketExpiresAt, type OrderStatus } from "./order";

export interface OrderRow {
  id: string;
  plan: "lite" | "full";
  amount: number;
  status: OrderStatus;
  pay_method: string | null;
  mode: string | null;
  owner_token_hash: string;
  created_at: string;
  paid_at: string | null;
  used_at: string | null;
  use_expires_at: string | null;
}

const COLS = "id, plan, amount, status, pay_method, mode, owner_token_hash, created_at, paid_at, used_at, use_expires_at";

export async function getOrder(id: string): Promise<OrderRow | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db.from("orders").select(COLS).eq("id", id).maybeSingle<OrderRow>();
  if (error) console.error(`[pay] order read failed: ${error.code}`);
  return data ?? null;
}

export function ownsOrder(order: OrderRow, secret: string | null): boolean {
  return verifyToken(secret, order.owner_token_hash);
}

/**
 * 토스페이 결제 상태 확인 API로 주문을 맞춘다(retUrl·콜백 본문은 믿지 않는다).
 * 금액이 다르면 결제 완료로 보지 않는다.
 */
export async function syncOrder(order: OrderRow): Promise<OrderRow> {
  if (order.status !== "created" && order.status !== "paid") return order;
  const st = await paymentStatus(order.id);
  if (!st) return order;
  const next = statusFromToss(st.payStatus);
  if (!next || next === order.status) return order;
  if (next === "paid" && st.amount !== order.amount) {
    console.error(`[pay] amount mismatch ${order.id}`);
    return order;
  }
  const db = getSupabase()!;
  const now = new Date();
  const patch: Partial<OrderRow> =
    next === "paid"
      ? { status: "paid", pay_method: st.payMethod ?? null, mode: st.mode, paid_at: now.toISOString(), use_expires_at: ticketExpiresAt(now).toISOString() }
      : { status: next, mode: st.mode };
  // 동시에 콜백과 완료 화면이 와도 created 상태일 때만 갱신
  const { data, error } = await db.from("orders").update(patch).eq("id", order.id).eq("status", order.status).select(COLS).maybeSingle<OrderRow>();
  if (error) console.error(`[pay] order update failed: ${error.code}`);
  return data ?? (await getOrder(order.id)) ?? order;
}

/** 화면에 보여줄 주문 정보 (비밀값 해시는 빼고) */
export function publicOrder(o: OrderRow) {
  return {
    orderNo: o.id,
    plan: o.plan,
    amount: o.amount,
    status: o.status,
    payMethod: o.pay_method,
    mode: o.mode,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    usedAt: o.used_at,
    useExpiresAt: o.use_expires_at,
  };
}
export type PublicOrder = ReturnType<typeof publicOrder>;
