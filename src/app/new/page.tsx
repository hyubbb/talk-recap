"use client";

import Link from "next/link";
import { useAtom, useAtomValue, useStore } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RecentReports } from "@/components/upload/RecentReports";
import { DataNoticeModal } from "@/components/DataNoticeModal";
import { AnalysisOverlay } from "@/components/analysis/AnalysisOverlay";
import { Dropzone } from "@/components/upload/Dropzone";
import { MemberEditor } from "@/components/upload/MemberEditor";
import { RangePicker } from "@/components/upload/RangePicker";
import { StatsPreview } from "@/components/upload/StatsPreview";
import { FormatReport } from "@/components/upload/FormatReport";
import { needsFormatReport } from "@/lib/kakao/formatReport";
import { useAnalyzeWorker } from "@/hooks/useAnalyzeWorker";
import { useRunAnalysis } from "@/hooks/useRunAnalysis";
import { analysisAtom } from "@/state/analysis";
import { aliasesAtom, consentAtom, groupsAtom, metaAtom, phaseAtom, rangeAtom } from "@/state/upload";
import { useSetAtom } from "jotai";
import { priceLabel, productForDays, spanDays } from "@/lib/legal/business";
import { clearPending, loadPending, savePending } from "@/lib/pay/pending";
import type { PaidOrder } from "@/hooks/useRunAnalysis";
import { statsAtom } from "@/state/upload";

/** 결제 후 분석 (실거래 키를 받기 전까지는 꺼 두고, ?pay=1 이면 결제 흐름을 미리 볼 수 있다) */
const PAYMENT_REQUIRED = process.env.NEXT_PUBLIC_PAYMENT_REQUIRED === "1";
import type { MemberGroup } from "@/lib/kakao/members";
import type { DateRange } from "@/workers/protocol";

const STEP_LABEL = { reading: "파일 여는 중", parsing: "메시지 읽는 중", stats: "통계 내는 중" } as const;

export default function NewPage() {
  const phase = useAtomValue(phaseAtom);
  const meta = useAtomValue(metaAtom);
  const [consent, setConsent] = useAtom(consentAtom);
  const { parse, recompute, chunkTexts, contexts } = useAnalyzeWorker();
  const run = useRunAnalysis(chunkTexts, contexts);
  const analysis = useAtomValue(analysisAtom);
  const router = useRouter();
  const store = useStore();

  useEffect(() => {
    if (analysis.kind === "done") router.push(`/r/${analysis.reportId}`);
  }, [analysis, router]);

  const range = useAtomValue(rangeAtom);
  const setAliases = useSetAtom(aliasesAtom);
  const setGroups = useSetAtom(groupsAtom);
  const setRange = useSetAtom(rangeAtom);
  const filesRef = useRef<File[]>([]);
  // 실패 후 다시 시도는 같은 결제로 (결제 후 3시간 안)
  const lastOrder = useRef<PaidOrder>(null);
  const [payMode, setPayMode] = useState(PAYMENT_REQUIRED);
  const [agreed, setAgreed] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const resumeRef = useRef<{ order: PaidOrder; groups: MemberGroup[]; range: DateRange | null; aliases: Record<string, string[]> } | null>(null);

  // 분석할 기간(일). 기간을 따로 고르지 않았으면 대화 전체 → 가격이 정해진다
  const span = range ?? (meta ? { from: meta.firstTs, to: meta.lastTs } : null);
  const days = span ? spanDays(span.from, span.to) : 0;
  const product = productForDays(days);

  const onFiles = (files: File[]) => {
    filesRef.current = files;
    parse(files);
  };

  // ?pay=1 결제 흐름 미리 보기, ?sample=1 샘플 대화, ?resume=주문번호 결제하고 돌아옴
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // URL을 읽은 결과는 다음 틱에 반영한다 (effect 안에서 바로 setState 하지 않기)
    if (q.get("pay") === "1") queueMicrotask(() => setPayMode(true));
    if (q.get("sample") === "1") {
      fetch("/sample-kakao.txt")
        .then((r) => r.blob())
        .then((b) => onFiles([new File([b], "샘플-가짜대화.txt", { type: "text/plain" })]));
    }
    const orderNo = q.get("resume");
    if (orderNo) {
      loadPending(orderNo).then((p) => {
        if (!p) return setPayError("결제한 대화를 이 브라우저에서 찾지 못했어요. 결제가 됐다면 고객센터로 주문번호를 보내 주세요.");
        setPayMode(true);
        setConsent(true);
        setAgreed(true);
        resumeRef.current = { order: { orderNo: p.orderNo, secret: p.secret }, groups: p.groups, range: p.range, aliases: p.aliases };
        filesRef.current = p.files;
        setAliases(p.aliases);
        parse(p.files, p.aliases);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 돌아온 대화를 다시 읽고 나면, 결제 전 설정(멤버·기간)을 되돌린 뒤 바로 분석을 시작한다
  useEffect(() => {
    const r = resumeRef.current;
    if (!r || phase.kind !== "ready") return;
    resumeRef.current = null;
    setGroups(r.groups);
    setRange(r.range);
    const before = store.get(statsAtom);
    recompute(r.groups, r.aliases, r.range);
    const go = () => {
      clearPending(r.order!.orderNo).catch(() => {});
      lastOrder.current = r.order;
      run.mutate(r.order);
    };
    const unsub = store.sub(statsAtom, () => {
      if (store.get(statsAtom) !== before) {
        unsub();
        go();
      }
    });
    const t = setTimeout(() => {
      unsub();
      go();
    }, 3000);
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [phase, store, setGroups, setRange, recompute, run]);

  const start = async () => {
    setPayError(null);
    if (!payMode) return run.mutate(null);
    if (!product) return;
    setPayBusy(true);
    try {
      const res = await fetch("/api/pay/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days, agreed: true }),
      });
      const b = (await res.json().catch(() => null)) as { orderNo?: string; secret?: string; checkoutPage?: string; error?: string } | null;
      if (!res.ok || !b?.orderNo || !b.secret || !b.checkoutPage) throw new Error(b?.error ?? "결제창을 열지 못했어요.");
      await savePending({
        orderNo: b.orderNo,
        secret: b.secret,
        files: filesRef.current,
        groups: store.get(groupsAtom),
        aliases: store.get(aliasesAtom),
        range: store.get(rangeAtom),
      });
      window.location.assign(b.checkoutPage);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "다시 시도해 주세요.");
      setPayBusy(false);
    }
  };
  const blocked = payMode && (!product || !agreed || payBusy);
  // 버튼을 누른 직후(구간 준비)부터 결과 페이지로 넘어갈 때까지 진행 중으로 본다
  const running = run.isPending || analysis.kind === "running" || analysis.kind === "done";
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 멤버·별명·기간 중 무엇이 바뀌든 최신 값 셋을 모아 한 번만 다시 계산한다
  const schedule = (groups: MemberGroup[], aliases: Record<string, string[]>, range: DateRange | null) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => recompute(groups, aliases, range), 250);
  };
  const onMembersChange = (groups: MemberGroup[], aliases: Record<string, string[]>) =>
    schedule(groups, aliases, store.get(rangeAtom));
  const onRangeChange = (range: DateRange | null) =>
    schedule(store.get(groupsAtom), store.get(aliasesAtom), range);

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-48">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="font-pixel text-[15px]">
          Talk Recap
        </Link>
      </header>

      <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">대화 올리기</h1>
      <p className="mt-2 text-[15px] leading-[1.6] text-haze">
        파일은 이 브라우저 안에서만 읽어요. 다음 단계에서 분석을 시작하기 전까지 아무것도 서버로 보내지 않아요.
      </p>
      {/* dialog는 <p> 안에 둘 수 없어서 문단 밖에 둔다 */}
      <DataNoticeModal className="mt-2 self-start" />

      <div className="mt-6">
        <Dropzone onFiles={onFiles} busy={phase.kind === "working"} />
      </div>
      {!meta && payError && (
        <p className="mt-4 rounded-[14px] bg-dusk p-4 text-[14px] text-danger" role="alert">
          {payError}
        </p>
      )}
      {!meta && <RecentReports />}

      {phase.kind === "working" && (
        <p className="mt-4 text-[14px] text-haze" role="status">
          {STEP_LABEL[phase.step]}…
        </p>
      )}
      {phase.kind === "error" && (
        <p className="mt-4 rounded-[14px] bg-dusk p-4 text-[14px] text-danger" role="alert">
          {phase.message}
        </p>
      )}

      {phase.kind === "ready" && meta && (
        <>
          <p className="mt-4 text-[13px] text-haze">
            파일 {meta.files.length}개 · 메시지 {meta.messageCount.toLocaleString()}개 읽음
            {meta.unparsedLines > 0 && ` · 해석 못 한 줄 ${meta.unparsedLines}개`}
          </p>
          {needsFormatReport(meta.unparsedLines, meta.messageCount) && (
            <FormatReport samples={meta.unparsedSamples} unparsed={meta.unparsedLines} />
          )}

          <h2 className="mt-10 text-[20px] font-bold">분석할 기간</h2>
          <p className="mt-1 mb-4 text-[14px] leading-[1.55] text-haze">
            올린 대화 중 일부 기간만 골라서 분석할 수 있어요.
          </p>
          <RangePicker onChange={onRangeChange} />

          <h2 className="mt-10 text-[20px] font-bold">멤버 확인</h2>
          <p className="mt-1 mb-4 text-[14px] leading-[1.55] text-haze">
            닉네임을 바꾼 사람은 합치고, 단톡방에서 부르는 별명을 적어 주세요. 별명은 &lsquo;누가 누구를 부르나&rsquo; 분석에 쓰여요.
          </p>
          <MemberEditor onChange={onMembersChange} />

          <h2 className="mt-10 mb-4 text-[20px] font-bold">미리 보기</h2>
          <StatsPreview />

          <div data-fixed-cta className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-night via-night to-transparent pt-8">
            <div className="bg-night pb-5">
            <div className="mx-auto max-w-[560px] px-5">
              <label className="mb-3 flex items-start gap-2 text-[13px] leading-[1.5] text-haze">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-4 accent-spark"
                />
                방 멤버들에게 이 대화를 분석에 쓴다고 알렸고, 동의를 받았어요.
              </label>
              {payMode && (
                <div className="mb-3 text-[13px] leading-[1.5] text-haze">
                  {product ? (
                    <p>
                      분석 기간 {days}일 · <b className="text-moon">{priceLabel(product)}</b> 토스페이 결제 · 결제하면 바로 분석이 시작돼요.{" "}
                      <Link href="/pricing" className="underline">
                        요금
                      </Link>
                    </p>
                  ) : (
                    <p className="text-danger">최대 1년까지 분석할 수 있어요. 분석할 기간을 1년 이하로 골라 주세요.</p>
                  )}
                  <label className="mt-2 flex items-start gap-2">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-spark" />
                    <span>
                      분석이 시작되면 디지털 콘텐츠 특성상 청약철회가 제한되는 것을 확인했고{" "}
                      <Link href="/terms" className="underline">
                        이용약관
                      </Link>
                      ·
                      <Link href="/refund" className="underline">
                        환불 정책
                      </Link>
                      에 동의해요. (필수)
                    </span>
                  </label>
                </div>
              )}
              {payError && (
                <p className="mb-2 text-[13px] text-danger" role="alert">
                  {payError}
                </p>
              )}
              <button
                type="button"
                disabled={!consent || running || blocked}
                onClick={start}
                className={`h-14 w-full rounded-[16px] text-[17px] font-bold disabled:opacity-40 ${payMode ? "bg-[#0064FF] text-white" : "bg-spark text-spark-ink"}`}
              >
                {running
                  ? "분석하는 중…"
                  : payBusy
                    ? "결제창 여는 중…"
                    : payMode && product
                      ? `${product.price}원 결제하고 분석 시작`
                      : payMode
                        ? "기간을 1년 이하로 골라 주세요"
                      : analysis.kind === "error"
                        ? "다시 분석하기"
                        : "AI 분석 시작"}
              </button>
            </div>
            </div>
          </div>
        </>
      )}
      <AnalysisOverlay pending={run.isPending} onRetry={() => run.mutate(lastOrder.current)} />
    </main>
  );
}
