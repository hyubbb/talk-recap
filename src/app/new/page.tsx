"use client";

import Link from "next/link";
import { useAtom, useAtomValue } from "jotai";
import { useRef } from "react";
import { Dropzone } from "@/components/upload/Dropzone";
import { MemberEditor } from "@/components/upload/MemberEditor";
import { StatsPreview } from "@/components/upload/StatsPreview";
import { useAnalyzeWorker } from "@/hooks/useAnalyzeWorker";
import { consentAtom, metaAtom, phaseAtom } from "@/state/upload";
import type { MemberGroup } from "@/lib/kakao/members";

const STEP_LABEL = { reading: "파일 여는 중", parsing: "메시지 읽는 중", stats: "통계 내는 중" } as const;

export default function NewPage() {
  const phase = useAtomValue(phaseAtom);
  const meta = useAtomValue(metaAtom);
  const [consent, setConsent] = useAtom(consentAtom);
  const { parse, recompute } = useAnalyzeWorker();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMembersChange = (groups: MemberGroup[], aliases: Record<string, string[]>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => recompute(groups, aliases), 250);
  };

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-48">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="font-pixel text-[15px]">
          톡방 Wrapped
        </Link>
      </header>

      <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">대화 올리기</h1>
      <p className="mt-2 text-[15px] leading-[1.6] text-haze">
        파일은 이 브라우저 안에서만 읽어요. 다음 단계에서 분석을 시작하기 전까지 아무것도 서버로 보내지 않아요.
      </p>

      <div className="mt-6">
        <Dropzone onFiles={parse} busy={phase.kind === "working"} />
      </div>

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

          <h2 className="mt-10 text-[20px] font-bold">멤버 확인</h2>
          <p className="mt-1 mb-4 text-[14px] leading-[1.55] text-haze">
            닉네임을 바꾼 사람은 합치고, 단톡방에서 부르는 별명을 적어 주세요. 별명은 &lsquo;누가 누구를 부르나&rsquo; 분석에 쓰여요.
          </p>
          <MemberEditor onChange={onMembersChange} />

          <h2 className="mt-10 mb-4 text-[20px] font-bold">미리 보기</h2>
          <StatsPreview />

          <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-night via-night to-transparent pt-8 pb-5">
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
              <button
                type="button"
                disabled
                className="h-14 w-full rounded-[16px] bg-spark text-[17px] font-bold text-spark-ink disabled:opacity-40"
              >
                AI 분석 시작 (다음 단계에서 연결)
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
