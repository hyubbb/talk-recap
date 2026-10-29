"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
  aliasesAtom,
  chunksAtom,
  groupsAtom,
  metaAtom,
  phaseAtom,
  statsAtom,
} from "@/state/upload";
import type { MemberGroup } from "@/lib/kakao/members";
import type { WorkerRequest, WorkerResponse } from "@/workers/protocol";

/** 파싱·통계 워커를 붙잡고, 결과를 jotai 상태로 흘려보낸다. */
export function useAnalyzeWorker() {
  const workerRef = useRef<Worker | null>(null);
  const setPhase = useSetAtom(phaseAtom);
  const setMeta = useSetAtom(metaAtom);
  const setGroups = useSetAtom(groupsAtom);
  const setStats = useSetAtom(statsAtom);
  const setChunks = useSetAtom(chunksAtom);
  const aliases = useAtomValue(aliasesAtom);

  useEffect(() => {
    const w = new Worker(new URL("../workers/analyze.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "progress") setPhase({ kind: "working", step: msg.step });
      else if (msg.type === "parsed") {
        setMeta(msg.meta);
        setGroups(msg.groups);
        setStats(msg.stats);
        setChunks(msg.chunks);
        setPhase({ kind: "ready" });
      } else if (msg.type === "recomputed") {
        setStats(msg.stats);
        setChunks(msg.chunks);
      } else if (msg.type === "error") setPhase({ kind: "error", message: msg.message });
    };
    workerRef.current = w;
    return () => w.terminate();
  }, [setPhase, setMeta, setGroups, setStats, setChunks]);

  const send = (req: WorkerRequest) => workerRef.current?.postMessage(req);

  const parse = useCallback(
    (files: File[]) => {
      setPhase({ kind: "working", step: "reading" });
      send({ type: "parse", files, aliases });
    },
    [aliases, setPhase],
  );

  const recompute = useCallback(
    (groups: MemberGroup[], nextAliases: Record<string, string[]>) =>
      send({ type: "recompute", groups, aliases: nextAliases }),
    [],
  );

  return { parse, recompute };
}
