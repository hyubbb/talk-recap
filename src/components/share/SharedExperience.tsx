"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SavedReport } from "@/lib/report/storage";
import { useMe } from "@/hooks/useLocalValue";
import { ReportView } from "@/components/report/ReportView";
import { Story } from "@/components/story/Story";
import { ObjectionProvider } from "@/components/objection/ObjectionProvider";
import { PickMe } from "./PickMe";

/**
 * 공유 링크 첫 화면: 나는 누구? → 내 카드 → 스토리 → 리포트.
 * 이름을 이미 고른 브라우저는 바로 스토리부터.
 */
export function SharedExperience({ saved, shareId, expiresAt }: { saved: SavedReport; shareId: string; expiresAt: string }) {
  const [me, setMe] = useMe(shareId);
  const [stage, setStage] = useState<"story" | "report" | null>(null);
  const router = useRouter();

  if (me === undefined) return <main className="mx-auto max-w-[560px] px-5 py-16 text-haze">불러오는 중…</main>;
  if (me === null) {
    return (
      <PickMe
        saved={saved}
        onDone={(name) => {
          setMe(name);
          setStage("story");
        }}
      />
    );
  }

  const share = async () => {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) await navigator.share({ title: saved.report.title, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  if ((stage ?? "story") === "story") {
    return (
      <Story
        saved={saved}
        me={me || null}
        onClose={() => setStage("report")}
        onQuiz={() => router.push(`/s/${shareId}/quiz`)}
        onShare={share}
      />
    );
  }

  return (
    <ObjectionProvider shareId={shareId} me={me || null} memberCount={saved.members.length}>
      <ReportView
        saved={saved}
        shared={{ expiresAt }}
        me={me || null}
        actions={
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => setStage("story")} className="rounded-full bg-dusk px-4 py-2 text-[14px] font-semibold">
              스토리 다시 보기
            </button>
            <a href={`/s/${shareId}/quiz`} className="rounded-full bg-spark px-4 py-2 text-[14px] font-bold text-spark-ink">
              이 말 누가 했게? 퀴즈
            </a>
            <button type="button" onClick={() => setMe(null)} className="rounded-full bg-dusk px-4 py-2 text-[14px] text-haze">
              {me ? `${me}(으)로 보는 중 · 바꾸기` : "구경 중 · 이름 고르기"}
            </button>
          </div>
        }
      />
    </ObjectionProvider>
  );
}
