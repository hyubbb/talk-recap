"use client";

import type { MemberGroup } from "@/lib/kakao/members";
import type { ChunkNotes, Report } from "@/lib/llm/schema";
import type { DateRange } from "@/workers/protocol";

/**
 * 결제창(토스페이)으로 넘어갔다 돌아오면 페이지가 새로 열려 워커 메모리의 대화가 사라진다.
 * 그래서 결제 직전에 대화 파일과 설정을 이 브라우저의 IndexedDB에만 넣어 두고,
 * 분석이 끝나면 지운다(결과 id만 남김). 서버로는 보내지 않는다.
 *
 * 분석 중 새로고침·탭 닫힘에 대비해 끝난 구간 노트와 종합 결과도 같은 곳에 남긴다.
 * 다시 열면 끝난 단계는 건너뛰고 이어서 하므로 결제를 다시 하지 않는다.
 */
export interface PendingAnalysis {
  orderNo: string;
  secret: string;
  files: File[];
  groups: MemberGroup[];
  aliases: Record<string, string[]>;
  range: DateRange | null;
  createdAt: number;
  /** 분석이 끝나면 대화·설정을 지우고 결과 id만 남긴다 (끝난 뒤 새로고침해도 결과로 보낸다) */
  reportId?: string;
}

/** 끝난 구간 하나 (index는 구간 번호, total은 그때 구간 수: 구간이 달라지면 버린다) */
export interface ChunkCheckpoint {
  index: number;
  total: number;
  notes: ChunkNotes;
  dropped: number;
  usage: { input: number; output: number };
  provider: string;
}
export interface SynthCheckpoint {
  /** 그때 구간 수 */
  total: number;
  /** 여기까지(구간 + 종합) 버린 인용 수와 토큰 합계 */
  dropped: number;
  report: Report;
  usage: { input: number; output: number };
  provider: string;
}
export interface Progress {
  chunks: ChunkCheckpoint[];
  synth: SynthCheckpoint | null;
}

const DB = "talkrecap";
const STORE = "pending";
const PROGRESS = "progress";
/** 결제 후 서버가 같은 주문으로 분석을 받아 주는 시간(3시간)보다 조금 짧게 */
const MAX_AGE = 2.5 * 60 * 60 * 1000;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "orderNo" });
      if (!db.objectStoreNames.contains(PROGRESS)) db.createObjectStore(PROGRESS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    t.oncomplete = () => db.close();
  });
}

/** 진행 기록 키: "주문번호:c:구간번호", "주문번호:synth" */
const chunkKey = (orderNo: string, index: number) => `${orderNo}:c:${String(index).padStart(4, "0")}`;
const synthKey = (orderNo: string) => `${orderNo}:synth`;
const allKeys = (orderNo: string) => IDBKeyRange.bound(`${orderNo}:`, `${orderNo}:\uffff`);

export const savePending = (p: Omit<PendingAnalysis, "createdAt" | "reportId">) =>
  tx(STORE, "readwrite", (s) => s.put({ ...p, createdAt: Date.now() }));

export async function loadPending(orderNo: string): Promise<PendingAnalysis | null> {
  const p = (await tx<PendingAnalysis | undefined>(STORE, "readonly", (s) => s.get(orderNo))) ?? null;
  if (p && Date.now() - p.createdAt > MAX_AGE) {
    await clearPending(orderNo);
    return null;
  }
  return p;
}

/** 끝나지 않은 결제 분석 (대화가 남아 있고 결과가 아직 없는 것), 최근 순 */
export async function listUnfinished(): Promise<PendingAnalysis[]> {
  const all = await tx<PendingAnalysis[]>(STORE, "readonly", (s) => s.getAll());
  return all
    .filter((p) => !p.reportId && p.files.length > 0 && Date.now() - p.createdAt <= MAX_AGE)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function clearPending(orderNo: string): Promise<void> {
  await tx(STORE, "readwrite", (s) => s.delete(orderNo));
  await tx(PROGRESS, "readwrite", (s) => s.delete(allKeys(orderNo)));
}

export const saveChunkProgress = (orderNo: string, c: ChunkCheckpoint) =>
  tx(PROGRESS, "readwrite", (s) => s.put({ ...c, at: Date.now() }, chunkKey(orderNo, c.index)));

export const saveSynthProgress = (orderNo: string, c: SynthCheckpoint) =>
  tx(PROGRESS, "readwrite", (s) => s.put({ ...c, at: Date.now() }, synthKey(orderNo)));

/** 이 주문으로 끝내 둔 단계. total이 지금 구간 수와 다르면(설정이 바뀜) 구간 기록은 쓰지 않는다 */
export async function loadProgress(orderNo: string, total: number): Promise<Progress> {
  const rows = await tx<(Partial<ChunkCheckpoint & SynthCheckpoint> & { at: number })[]>(PROGRESS, "readonly", (s) =>
    s.getAll(allKeys(orderNo)),
  );
  const fresh = rows.filter((r) => Date.now() - r.at <= MAX_AGE);
  const chunks = fresh.filter((r): r is ChunkCheckpoint & { at: number } => typeof r.index === "number" && r.total === total);
  const synth = fresh.find((r) => r.report && typeof r.index !== "number") as (SynthCheckpoint & { at: number }) | undefined;
  return { chunks, synth: synth && synth.total === total ? synth : null };
}

/** 분석이 끝나면 대화·진행 기록은 지우고 결과 id만 남긴다 */
export async function finishPending(orderNo: string, reportId: string): Promise<void> {
  const p = await tx<PendingAnalysis | undefined>(STORE, "readonly", (s) => s.get(orderNo));
  await tx(PROGRESS, "readwrite", (s) => s.delete(allKeys(orderNo)));
  if (!p) return;
  const done: PendingAnalysis = { ...p, files: [], groups: [], aliases: {}, range: null, reportId, createdAt: Date.now() };
  await tx(STORE, "readwrite", (s) => s.put(done));
}

/** 분석 API에 붙이는 결제 증빙 헤더 */
export const orderHeaders = (o: { orderNo: string; secret: string } | null): Record<string, string> =>
  o ? { "x-order": o.orderNo, "x-order-secret": o.secret } : {};
