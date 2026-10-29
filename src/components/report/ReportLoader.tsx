"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Story } from "@/components/story/Story";
import type { SavedReport } from "@/lib/report/storage";
import { ReportView } from "./ReportView";
import { loadReport } from "@/lib/report/storage";
import { SharePanel } from "@/components/share/SharePanel";

const noop = () => () => {};

export function ReportLoader({ id, shareEnabled }: { id: string; shareEnabled: boolean }) {
  // localStorage는 브라우저에서만 읽을 수 있으므로 서버 렌더 때는 null
  const raw = useSyncExternalStore(
    noop,
    () => JSON.stringify(loadReport(id)),
    () => "null",
  );
  const saved = JSON.parse(raw) as ReturnType<typeof loadReport>;

  if (!saved) {
    return (
      <main className="mx-auto max-w-[560px] px-5 py-16">
        <p className="text-[17px] font-bold">이 결과를 찾을 수 없어요</p>
        <p className="mt-2 text-[15px] text-haze">
          지금은 분석한 브라우저에만 결과가 저장돼요. 같은 브라우저에서 열었는지 확인해 주세요.
        </p>
        <Link href="/new" className="mt-6 inline-block text-[15px] text-spark">
          새로 분석하기
        </Link>
      </main>
    );
  }
  return <LocalExperience saved={saved} shareEnabled={shareEnabled} />;
}

/** 업로더 화면: 스토리 먼저 → 리포트(공유 버튼 포함) */
function LocalExperience({ saved, shareEnabled }: { saved: SavedReport; shareEnabled: boolean }) {
  const [story, setStory] = useState(true);
  const router = useRouter();
  const toShare = () => {
    setStory(false);
    requestAnimationFrame(() => document.getElementById("share-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  if (story) {
    return (
      <Story
        saved={saved}
        onClose={() => setStory(false)}
        onQuiz={() => router.push(`/r/${saved.id}/quiz`)}
        onShare={shareEnabled ? toShare : undefined}
      />
    );
  }
  return (
    <ReportView
      saved={saved}
      actions={
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => setStory(true)} className="rounded-full bg-dusk px-4 py-2 text-[14px] font-semibold">
              스토리 다시 보기
            </button>
            <Link href={`/r/${saved.id}/quiz`} className="rounded-full bg-dusk px-4 py-2 text-[14px] font-semibold">
              퀴즈 미리 풀기
            </Link>
          </div>
          <SharePanel saved={saved} enabled={shareEnabled} />
        </>
      }
    />
  );
}
