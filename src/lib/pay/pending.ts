"use client";

import type { MemberGroup } from "@/lib/kakao/members";
import type { DateRange } from "@/workers/protocol";

/**
 * 결제창(토스페이)으로 넘어갔다 돌아오면 페이지가 새로 열려 워커 메모리의 대화가 사라진다.
 * 그래서 결제 직전에 대화 파일과 설정을 이 브라우저의 IndexedDB에만 잠깐 넣어 두고,
 * 돌아와서 분석을 시작하면 바로 지운다. 서버로는 보내지 않는다.
 */
export interface PendingAnalysis {
  orderNo: string;
  secret: string;
  files: File[];
  groups: MemberGroup[];
  aliases: Record<string, string[]>;
  range: DateRange | null;
  createdAt: number;
}

const DB = "talkrecap";
const STORE = "pending";
const MAX_AGE = 2 * 60 * 60 * 1000; // 2시간 지난 건 버린다

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "orderNo" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    t.oncomplete = () => db.close();
  });
}

export const savePending = (p: PendingAnalysis) => tx("readwrite", (s) => s.put(p));

export async function loadPending(orderNo: string): Promise<PendingAnalysis | null> {
  const p = (await tx<PendingAnalysis | undefined>("readonly", (s) => s.get(orderNo))) ?? null;
  if (p && Date.now() - p.createdAt > MAX_AGE) {
    await clearPending(orderNo);
    return null;
  }
  return p;
}

export const clearPending = (orderNo: string) => tx("readwrite", (s) => s.delete(orderNo));

/** 분석 API에 붙이는 결제 증빙 헤더 */
export const orderHeaders = (o: { orderNo: string; secret: string } | null): Record<string, string> =>
  o ? { "x-order": o.orderNo, "x-order-secret": o.secret } : {};
