"use client";

import { useMutation } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";
import type { SavedReport } from "@/lib/report/storage";
import type { ShareInfo } from "@/lib/share/schema";

const KEY = (reportId: string) => `tokbang:share:${reportId}`;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
};
const emit = () => listeners.forEach((fn) => fn());

/** 저장된 공유 정보. 만료된 건 없는 것으로 본다. */
function readShare(reportId: string): string | null {
  try {
    const raw = localStorage.getItem(KEY(reportId));
    if (!raw) return null;
    const { expiresAt } = JSON.parse(raw) as ShareInfo;
    return new Date(expiresAt).getTime() > Date.now() ? raw : null;
  } catch {
    return null;
  }
}
function writeShare(reportId: string, info: ShareInfo | null) {
  try {
    if (info) localStorage.setItem(KEY(reportId), JSON.stringify(info));
    else localStorage.removeItem(KEY(reportId));
  } catch {}
  emit();
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};

async function errorOf(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return new Error(body?.error ?? fallback);
}

export function SharePanel({ saved, enabled }: { saved: SavedReport; enabled: boolean }) {
  const raw = useSyncExternalStore(subscribe, () => readShare(saved.id), () => null);
  const info = raw ? (JSON.parse(raw) as ShareInfo) : null;
  const [copied, setCopied] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(saved),
      });
      if (!res.ok) throw await errorOf(res, "공유 링크를 만들지 못했어요.");
      return (await res.json()) as ShareInfo;
    },
    onSuccess: (data) => writeShare(saved.id, data),
  });

  const remove = useMutation({
    mutationFn: async (s: ShareInfo) => {
      const res = await fetch(`/api/share/${s.id}`, { method: "DELETE", headers: { "x-delete-token": s.deleteToken } });
      // 이미 없어진 링크면 로컬 정보만 지운다
      if (!res.ok && res.status !== 404) throw await errorOf(res, "공유를 중지하지 못했어요.");
    },
    onSuccess: () => writeShare(saved.id, null),
  });

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("링크를 복사해 주세요", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!enabled) {
    return (
      <section className="mt-8 rounded-[var(--radius-card)] bg-dusk p-5">
        <p className="text-[15px] font-bold">공유 링크</p>
        <p className="mt-1 text-[14px] leading-[1.55] text-haze">
          공유 기능이 아직 설정되지 않았어요. 서버에 <code className="text-moon">SUPABASE_URL</code>과{" "}
          <code className="text-moon">SUPABASE_SECRET_KEY</code>를 넣으면 켜져요.
        </p>
      </section>
    );
  }

  const error = create.error ?? remove.error;

  return (
    <section id="share-panel" className="mt-8 rounded-[var(--radius-card)] bg-dusk p-5" aria-live="polite">
      <p className="text-[15px] font-bold">공유 링크</p>
      {info ? (
        <>
          <p className="mt-2 truncate rounded-[14px] bg-dusk-2 px-4 py-3 text-[14px] tabular">{info.url}</p>
          <p className="mt-2 text-[13px] text-haze">{fmtDate(info.expiresAt)}까지 열려요. 링크가 있으면 누구나 볼 수 있어요.</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => copy(info.url)}
              className="flex-1 rounded-full bg-spark px-4 py-3 text-[15px] font-bold text-spark-ink"
            >
              {copied ? "복사했어요" : "링크 복사"}
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm("공유를 중지할까요? 링크를 받은 사람도 더 이상 볼 수 없어요.")) remove.mutate(info);
              }}
              className="rounded-full bg-dusk-2 px-4 py-3 text-[15px] font-semibold text-danger disabled:opacity-50"
            >
              {remove.isPending ? "중지하는 중…" : "공유 중지(삭제)"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-[14px] leading-[1.55] text-haze">
            결과(리포트와 통계)를 서버에 30일 동안 저장하고 링크를 만들어요. 대화 원문은 올라가지 않아요.
          </p>
          <button
            type="button"
            disabled={create.isPending}
            onClick={() => create.mutate()}
            className="mt-4 w-full rounded-full bg-spark px-4 py-3 text-[15px] font-bold text-spark-ink disabled:opacity-50"
          >
            {create.isPending ? "만드는 중…" : "공유 링크 만들기"}
          </button>
        </>
      )}
      {error && <p className="mt-3 text-[14px] text-danger">{error.message}</p>}
    </section>
  );
}
