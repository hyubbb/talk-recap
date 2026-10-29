import { describe, expect, it } from "vitest";
import { isValidOrderNo, newOrderNo, statusFromToss } from "./order";
import { PRODUCTS, SERVICE_PERIOD, productById, productForDays } from "../legal/business";

describe("주문", () => {
  it("주문번호 형식·유일성", () => {
    const a = newOrderNo(new Date("2026-10-29T12:00:00Z"));
    expect(a).toMatch(/^TR-20261029-[0-9A-Za-z]{10}$/);
    expect(isValidOrderNo(a)).toBe(true);
    expect(a.length).toBeLessThanOrEqual(50);
    expect(new Set(Array.from({ length: 500 }, () => newOrderNo())).size).toBe(500);
    expect(isValidOrderNo("TR-2026-x")).toBe(false);
  });

  it("토스페이 상태 매핑", () => {
    expect(statusFromToss("PAY_COMPLETE")).toBe("paid");
    expect(statusFromToss("PAY_CANCEL")).toBe("canceled");
    expect(statusFromToss("REFUND_SUCCESS")).toBe("refunded");
    expect(statusFromToss("PAY_STANDBY")).toBeNull();
  });

  it("분석 기간으로 상품 결정, 제공 완료까지 1년 이내", () => {
    expect(productForDays(1)?.id).toBe("lite");
    expect(productForDays(100)?.id).toBe("lite");
    expect(productForDays(101)?.id).toBe("full");
    expect(productForDays(365)?.id).toBe("full");
    expect(productForDays(366)).toBeNull();
    expect(SERVICE_PERIOD.totalDays).toBeLessThanOrEqual(365);
  });

  it("상품", () => {
    expect(PRODUCTS.map((p) => [p.price, p.days])).toEqual([
      [900, 100],
      [1500, 365],
    ]);
    expect(productById("lite")?.price).toBe(900);
    expect(productById("nope")).toBeNull();
    // 토스페이 최소 결제 금액보다 크고 정수
    for (const p of PRODUCTS) expect(Number.isInteger(p.price) && p.price >= 100).toBe(true);
  });
});
