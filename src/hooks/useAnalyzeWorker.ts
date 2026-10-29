"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
  aliasesAtom,
  chunksAtom,
  groupsAtom,
  metaAtom,
  phaseAtom,
  rangeAtom,
  rangeCountAtom,
  statsAtom,
} from "@/state/upload";
import type { MemberGroup } from "@/lib/kakao/members";
import type { ChunkText, DateRange, WorkerRequest, WorkerResponse } from "@/workers/protocol";
import type { ContextMap, PhraseSample } from "@/lib/report/context";

export interface ContextResult {
  contexts: ContextMap;
  phrases: Record<string, PhraseSample[]>;
}
export type ContextRequest = Omit<Extract<WorkerRequest, { type: "contexts" }>, "type">;

/** 파싱·통계 워커를 붙잡고, 결과를 jotai 상태로 흘려보낸다. */
export function useAnalyzeWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingTexts = useRef<((c: ChunkText[]) => void) | null>(null);
  const pendingContexts = useRef<((c: ContextResult) => void) | null>(null);
  const setPhase = useSetAtom(phaseAtom);
  const setMeta = useSetAtom(metaAtom);
  const setGroups = useSetAtom(groupsAtom);
  const setStats = useSetAtom(statsAtom);
  const setChunks = useSetAtom(chunksAtom);
  const setRange = useSetAtom(rangeAtom);
  const setRangeCount = useSetAtom(rangeCountAtom);
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
        setRange(null);
        setRangeCount(null);
        setPhase({ kind: "ready" });
      } else if (msg.type === "recomputed") {
        setStats(msg.stats);
        setChunks(msg.chunks);
        setRangeCount(msg.rangeCount);
      } else if (msg.type === "contexts") {
        pendingContexts.current?.({ contexts: msg.contexts, phrases: msg.phrases });
        pendingContexts.current = null;
      } else if (msg.type === "chunkTexts") {
        pendingTexts.current?.(msg.chunks);
        pendingTexts.current = null;
      } else if (msg.type === "error") setPhase({ kind: "error", message: msg.message });
    };
    workerRef.current = w;
    return () => w.terminate();
  }, [setPhase, setMeta, setGroups, setStats, setChunks, setRange, setRangeCount]);

  const send = (req: WorkerRequest) => workerRef.current?.postMessage(req);

  const parse = useCallback(
    (files: File[], withAliases?: Record<string, string[]>) => {
      setPhase({ kind: "working", step: "reading" });
      send({ type: "parse", files, aliases: withAliases ?? aliases });
    },
    [aliases, setPhase],
  );

  const recompute = useCallback(
    (groups: MemberGroup[], nextAliases: Record<string, string[]>, range: DateRange | null) =>
      send({ type: "recompute", groups, aliases: nextAliases, range }),
    [],
  );

  /** 분석 시작 직전에만 구간 원문을 받는다 */
  const chunkTexts = useCallback(
    (groups: MemberGroup[], range: DateRange | null) =>
      new Promise<ChunkText[]>((resolve) => {
        pendingTexts.current = resolve;
        send({ type: "chunkTexts", groups, range });
      }),
    [],
  );

  /** 분석이 끝난 뒤 결과에 쓰인 인용의 앞뒤 대화를 받는다 (원문 전체는 워커 밖으로 나오지 않는다) */
  const contexts = useCallback(
    (req: ContextRequest) =>
      new Promise<ContextResult>((resolve) => {
        pendingContexts.current = resolve;
        send({ type: "contexts", ...req });
      }),
    [],
  );

  return { parse, recompute, chunkTexts, contexts };
}
