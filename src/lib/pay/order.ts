import { randomBase62 } from "../share/token";
import { SERVICE_PERIOD } from "../legal/business";

/** 상점 주문번호: TR-YYYYMMDD-랜덤10자 (토스페이 orderNo 최대 50자, 가맹점 내 유일) */
export function newOrderNo(now = new Date()): string {
  const d = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `TR-${d}-${randomBase62(10)}`;
}

export function isValidOrderNo(id: string): boolean {
  return /^TR-\d{8}-[0-9A-Za-z]{10}$/.test(id);
}

/** 이용권 사용 기한: 결제 시각 + 30일 */
export function ticketExpiresAt(paidAt: Date): Date {
  return new Date(paidAt.getTime() + SERVICE_PERIOD.useDays * 86_400_000);
}

export type OrderStatus = "created" | "paid" | "canceled" | "used" | "refunded";

/** 토스페이 결제 상태 → 주문 상태 */
export function statusFromToss(payStatus: string): OrderStatus | null {
  if (payStatus === "PAY_COMPLETE" || payStatus === "SETTLEMENT_COMPLETE") return "paid";
  if (payStatus === "PAY_CANCEL") return "canceled";
  if (payStatus === "REFUND_SUCCESS" || payStatus === "SETTLEMENT_REFUND_COMPLETE") return "refunded";
  return null; // 대기·진행 중
}
