"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { loadOrders, type LocalOrder } from "@/lib/pay/local";
import { productById } from "@/lib/legal/business";
import type { PublicOrder } from "@/lib/pay/repo";

export type Ticket = { local: LocalOrder; order: PublicOrder };

/** 결제가 꼭 필요한지 (실거래 키를 받기 전까지는 무료로 열어 둔다) */
export const PAYMENT_REQUIRED = process.env.NEXT_PUBLIC_PAYMENT_REQUIRED === "1";

/** 이 브라우저의 쓸 수 있는 이용권(결제 완료, 미사용, 기한 안) 중 가장 최근 것 */
export function useTicket() {
  return useQuery({
    queryKey: ["ticket"],
    queryFn: async (): Promise<Ticket | null> => {
      for (const local of loadOrders()) {
        const res = await fetch(`/api/pay/order?order=${encodeURIComponent(local.orderNo)}`, { headers: { "x-order-secret": local.secret } });
        if (!res.ok) continue;
        const { order } = (await res.json()) as { order: PublicOrder };
        if (order.status === "paid" && (!order.useExpiresAt || new Date(order.useExpiresAt) > new Date())) return { local, order };
      }
      return null;
    },
    staleTime: 30_000,
  });
}

export function TicketBar({ ticket, days }: { ticket: Ticket | null | undefined; days: number }) {
  if (ticket) {
    const p = productById(ticket.order.plan)!;
    const over = days > p.days;
    return (
      <p className={`mb-3 rounded-[12px] px-3 py-2 text-[13px] ${over ? "bg-danger/15 text-danger" : "bg-dusk-2 text-haze"}`}>
        {p.name} 이용권 사용 · 최대 {p.days}일
        {ticket.order.useExpiresAt && ` · ${new Date(ticket.order.useExpiresAt).toLocaleDateString("ko-KR")}까지`}
        {over && ` · 지금 고른 기간(${days}일)이 길어요. 기간을 줄여 주세요.`}
      </p>
    );
  }
  return (
    <p className="mb-3 text-[13px] text-haze">
      {PAYMENT_REQUIRED ? "AI 분석에는 이용권이 필요해요. " : "AI 분석 이용권: 라이트 900원(100일) · 1년 1,500원. "}
      <Link href="/pricing" className="text-spark underline">
        요금 안내
      </Link>
    </p>
  );
}

/** 분석 시작 직전에 이용권을 사용 처리한다 */
export async function redeemTicket(t: Ticket, days: number): Promise<void> {
  const res = await fetch("/api/pay/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderNo: t.local.orderNo, secret: t.local.secret, days }),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(b?.error ?? "이용권을 사용하지 못했어요.");
  }
}
