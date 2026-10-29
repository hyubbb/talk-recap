"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SERVICE_PERIOD, priceLabel, productForDays } from "@/lib/legal/business";

const fmt = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};

/**
 * "AI 분석 시작"을 누르면 뜨는 결제 확인 창.
 * 고른 기간(일)로 요금이 정해진다는 걸 보여주고, 청약철회 제한에 동의를 받은 뒤 결제로 넘어간다.
 */
export function PayConfirm({
  open,
  days,
  from,
  to,
  busy,
  error,
  onPay,
  onClose,
  onChangeRange,
}: {
  open: boolean;
  days: number;
  from: number;
  to: number;
  busy: boolean;
  error: string | null;
  onPay: () => void;
  onClose: () => void;
  onChangeRange: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [agreed, setAgreed] = useState(false);
  const product = productForDays(days);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      className="m-auto w-[min(92vw,420px)] rounded-[var(--radius-card)] bg-dusk p-0 text-moon backdrop:bg-black/60"
      aria-labelledby="pay-confirm-title"
    >
      <div className="p-6">
        <h2 id="pay-confirm-title" className="text-[20px] font-extrabold">
          {product ? "결제하고 분석을 시작할까요?" : "기간이 1년을 넘어요"}
        </h2>

        <dl className="mt-4 grid grid-cols-[72px_1fr] gap-y-2 text-[15px]">
          <dt className="text-haze">분석 기간</dt>
          <dd>
            <b className="tabular">{days.toLocaleString()}일</b>
            <span className="text-[13px] text-haze">
              {" "}
              ({fmt(from)} ~ {fmt(to)})
            </span>
          </dd>
          {product && (
            <>
              <dt className="text-haze">요금</dt>
              <dd>
                <b className="text-spark">{priceLabel(product)}</b>
                <span className="text-[13px] text-haze"> · {product.name}</span>
              </dd>
              <dt className="text-haze">결제</dt>
              <dd>토스페이</dd>
            </>
          )}
        </dl>

        {product ? (
          <>
            <p className="mt-3 text-[13px] leading-[1.6] text-haze">
              {days}일은 {product.days >= 365 ? "100일을 넘어 1년 요금" : "100일 이하라 100일 요금"}이 적용돼요. 결제가 끝나면 바로 분석해서 보통 1~3분 안에 결과가
              나오고, 결과 재열람·이미지 저장·공유 링크는 분석일부터 {SERVICE_PERIOD.resultDays}일 동안 이용할 수 있어요.
            </p>
            <label className="mt-4 flex items-start gap-2 text-[13px] leading-[1.55]">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-spark" />
              <span>
                분석이 시작되면 디지털 콘텐츠 특성상 청약철회가 제한되는 것을 확인했고{" "}
                <Link href="/terms#refund" target="_blank" className="underline">
                  이용약관
                </Link>
                ·
                <Link href="/refund" target="_blank" className="underline">
                  환불 정책
                </Link>
                에 동의해요. (필수)
              </span>
            </label>
          </>
        ) : (
          <p className="mt-3 text-[14px] leading-[1.6] text-haze">최대 1년까지 분석할 수 있어요. 분석할 기간을 1년 이하로 다시 골라 주세요.</p>
        )}

        {error && (
          <p className="mt-3 text-[13px] text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {product ? (
            <button
              type="button"
              disabled={!agreed || busy}
              onClick={onPay}
              className="h-13 h-[52px] rounded-[14px] bg-[#0064FF] text-[16px] font-bold text-white disabled:opacity-40"
            >
              {busy ? "결제창 여는 중…" : `${product.price}원 결제하고 분석 시작`}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={product ? onClose : onChangeRange}
            className="h-12 rounded-[14px] bg-dusk-2 text-[15px] font-semibold"
          >
            {product ? "취소" : "기간 다시 고르기"}
          </button>
          {product && (
            <button type="button" disabled={busy} onClick={onChangeRange} className="text-[13px] text-haze underline">
              기간 바꾸기
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
