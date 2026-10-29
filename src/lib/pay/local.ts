"use client";

/** 이 브라우저에서 산 주문 (회원가입이 없어서 주문 비밀값을 여기 보관한다) */
export interface LocalOrder {
  orderNo: string;
  secret: string;
  plan: "lite" | "full";
  createdAt: number;
}

const KEY = "talkrecap:orders";

export function loadOrders(): LocalOrder[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as LocalOrder[];
  } catch {
    return [];
  }
}

export function saveOrder(o: LocalOrder): void {
  const list = loadOrders().filter((x) => x.orderNo !== o.orderNo);
  list.unshift(o);
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  } catch {}
}

export function findOrder(orderNo: string): LocalOrder | null {
  return loadOrders().find((o) => o.orderNo === orderNo) ?? null;
}
