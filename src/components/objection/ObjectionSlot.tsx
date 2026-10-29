"use client";

import { useState } from "react";
import { MAX_OBJECTION_CHARS } from "@/lib/objection/rules";
import { useObjections } from "./ObjectionProvider";

/** 항목 하나의 "이의 있음" 버튼과 반박·투표. 공유 화면(ObjectionProvider 안)에서만 보인다 */
export function ObjectionSlot({ target, owner }: { target: string; owner: string }) {
  const ctx = useObjections();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!ctx) return null;
  const items = ctx.items.filter((o) => o.target === target);
  const mine = items.find((o) => o.memberName === ctx.me);
  const isOwner = ctx.me === owner;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await ctx.submit(target, text.trim());
      setOpen(false);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {items.map((o) => (
        <div key={o.id} className="relative rounded-[14px] bg-dusk-2 p-3">
          <p className="text-[12px] text-haze">{o.memberName}의 반박</p>
          <p className="mt-1 text-[14px] leading-[1.55]">{o.body}</p>
          {o.status !== "open" && (
            <span
              className={`font-pixel absolute top-2 right-2 -rotate-6 rounded-[6px] border-2 px-2 py-0.5 text-[12px] ${o.status === "accepted" ? "border-spark text-spark" : "border-haze text-haze"}`}
            >
              {o.status === "accepted" ? "반박 성공" : "기각"}
            </span>
          )}
          <div className="mt-2 flex items-center gap-2 text-[13px]">
            {ctx.me !== o.memberName ? (
              <>
                <button
                  type="button"
                  onClick={() => ctx.vote(o.id, 1)}
                  aria-pressed={o.myVote === 1}
                  className={`rounded-full px-3 py-1 ${o.myVote === 1 ? "bg-spark text-spark-ink" : "bg-dusk"}`}
                >
                  인정 {o.accept}
                </button>
                <button
                  type="button"
                  onClick={() => ctx.vote(o.id, -1)}
                  aria-pressed={o.myVote === -1}
                  className={`rounded-full px-3 py-1 ${o.myVote === -1 ? "bg-moon text-night" : "bg-dusk"}`}
                >
                  기각 {o.reject}
                </button>
              </>
            ) : (
              <span className="text-haze">
                인정 {o.accept} · 기각 {o.reject}
              </span>
            )}
            <span className="ml-auto text-[12px] text-haze">{ctx.threshold}표면 결정</span>
          </div>
        </div>
      ))}
      {isOwner && !mine && !open && (
        <button type="button" onClick={() => setOpen(true)} className="self-start rounded-full border border-danger/60 px-3 py-1 text-[13px] text-danger">
          이의 있음
        </button>
      )}
      {open && (
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor={`obj-${target}`}>
            한 줄 반박
          </label>
          <textarea
            id={`obj-${target}`}
            value={text}
            maxLength={MAX_OBJECTION_CHARS}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="한 줄로 반박해 주세요"
            className="rounded-[12px] bg-dusk-2 p-3 text-[14px] outline-none"
          />
          <div className="flex items-center gap-2">
            <span className="tabular text-[12px] text-haze">
              {text.length}/{MAX_OBJECTION_CHARS}
            </span>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto text-[13px] text-haze">
              취소
            </button>
            <button type="button" disabled={busy || !text.trim()} onClick={send} className="rounded-full bg-spark px-4 py-1.5 text-[13px] font-bold text-spark-ink disabled:opacity-40">
              {busy ? "보내는 중…" : "반박하기"}
            </button>
          </div>
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
