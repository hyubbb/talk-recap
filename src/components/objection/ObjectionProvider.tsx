"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { voterKey } from "@/hooks/useLocalValue";
import { voteThreshold } from "@/lib/objection/rules";
import type { ObjectionItem } from "@/app/api/share/[id]/objections/route";
import type { ObjectionEvent } from "@/lib/objection/rules";

type List = { items: ObjectionItem[] };

/** 브로드캐스트·투표 결과를 목록 캐시에 바로 반영 (다시 읽지 않고 1초 안에 보이게) */
function applyEvent(prev: List | undefined, e: ObjectionEvent): List | undefined {
  if (!prev) return prev;
  if (e.type === "vote") {
    return {
      items: prev.items.map((o) =>
        o.id === e.id ? { ...o, accept: e.accept, reject: e.reject, status: e.status as ObjectionItem["status"] } : o,
      ),
    };
  }
  if (prev.items.some((o) => o.id === e.item.id)) return prev;
  const item: ObjectionItem = { ...e.item, status: e.item.status as ObjectionItem["status"], accept: 0, reject: 0, myVote: 0 };
  return { items: [...prev.items, item] };
}

interface Ctx {
  me: string | null;
  items: ObjectionItem[];
  threshold: number;
  live: boolean;
  submit: (target: string, body: string) => Promise<void>;
  vote: (id: number, value: 1 | -1) => void;
  error: string | null;
}

const ObjectionCtx = createContext<Ctx | null>(null);
export const useObjections = () => useContext(ObjectionCtx);

async function json<T>(res: Response): Promise<T> {
  const b = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(b?.error ?? "잠시 후 다시 시도해 주세요.");
  return b as T;
}

/**
 * 반박권 + 투표. 서버 API로 읽고 쓰고, Realtime Broadcast(report:{id})로 "바뀌었음" 신호를 받으면 다시 읽는다.
 * Realtime 키가 없으면 10초마다 다시 읽는다.
 */
export function ObjectionProvider({ shareId, me, memberCount, children }: { shareId: string; me: string | null; memberCount: number; children: ReactNode }) {
  const qc = useQueryClient();
  const key = ["objections", shareId];
  const [live, setLive] = useState(false);

  const list = useQuery({
    queryKey: key,
    queryFn: async () => json<List>(await fetch(`/api/share/${shareId}/objections`, { headers: { "x-voter-key": voterKey() } })),
    refetchInterval: live ? false : 10_000,
    staleTime: 0,
  });

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const ch = sb
      .channel(`report:${shareId}`)
      .on("broadcast", { event: "objections" }, (msg) => {
        const e = msg.payload as ObjectionEvent | undefined;
        if (e?.type) qc.setQueryData<List>(["objections", shareId], (prev) => applyEvent(prev, e));
        else qc.invalidateQueries({ queryKey: ["objections", shareId] });
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      sb.removeChannel(ch);
    };
  }, [shareId, qc]);

  const submitM = useMutation({
    mutationFn: async ({ target, body }: { target: string; body: string }) =>
      json(await fetch(`/api/share/${shareId}/objections`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target, memberName: me, body }) })),
    onSuccess: (res) => {
      const item = (res as { item?: Extract<ObjectionEvent, { type: "objection" }>["item"] }).item;
      if (item) qc.setQueryData<List>(key, (prev) => applyEvent(prev, { type: "objection", item }));
      else qc.invalidateQueries({ queryKey: key });
    },
  });
  const voteM = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: 1 | -1 }) =>
      json<{ result: { id: number; accept: number; reject: number; status: string } }>(
        await fetch(`/api/share/${shareId}/objections/${id}/vote`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ voterKey: voterKey(), value }),
        }),
      ),
    // 내 표는 바로 보이게 (서버 응답이 오면 정확한 집계로 덮어쓴다)
    onMutate: ({ id, value }) => {
      const prev = qc.getQueryData<List>(key);
      qc.setQueryData<List>(key, (p) =>
        p && {
          items: p.items.map((o) => {
            if (o.id !== id || o.myVote === value) return o;
            const undo = o.myVote === 1 ? { accept: o.accept - 1 } : o.myVote === -1 ? { reject: o.reject - 1 } : {};
            const n = { ...o, ...undo, myVote: value };
            return value === 1 ? { ...n, accept: n.accept + 1 } : { ...n, reject: n.reject + 1 };
          }),
        },
      );
      return { prev };
    },
    onError: (_e, _v, c) => c?.prev && qc.setQueryData(key, c.prev),
    onSuccess: ({ result }) => qc.setQueryData<List>(key, (p) => applyEvent(p, { type: "vote", ...result })),
  });

  const value: Ctx = {
    me,
    items: list.data?.items ?? [],
    threshold: voteThreshold(memberCount),
    live,
    submit: async (target, body) => {
      await submitM.mutateAsync({ target, body });
    },
    vote: (id, v) => voteM.mutate({ id, value: v }),
    error: (voteM.error ?? list.error)?.message ?? null,
  };
  return (
    <ObjectionCtx.Provider value={value}>
      <div data-realtime={live ? "on" : "off"} className="contents">
        {children}
      </div>
    </ObjectionCtx.Provider>
  );
}
