import type { Report } from "@/lib/llm/schema";
import type { RoomStats } from "@/lib/kakao/stats";

/** 결과 한 건. MVP에서는 이 브라우저(localStorage)에만 저장한다. 공유는 Supabase 연결 후. */
export interface SavedReport {
  id: string;
  createdAt: number;
  provider: string;
  members: { id: string; name: string; color: string }[];
  stats: RoomStats;
  report: Report;
  usage: { input: number; output: number };
  droppedQuotes: number;
}

const KEY = (id: string) => `tokbang:report:${id}`;

export function saveReport(r: SavedReport): void {
  try {
    localStorage.setItem(KEY(r.id), JSON.stringify(r));
  } catch {
    // 저장 공간이 없으면 세션에만 남긴다
    sessionStorage.setItem(KEY(r.id), JSON.stringify(r));
  }
}

export function loadReport(id: string): SavedReport | null {
  try {
    const raw = localStorage.getItem(KEY(id)) ?? sessionStorage.getItem(KEY(id));
    return raw ? (JSON.parse(raw) as SavedReport) : null;
  } catch {
    return null;
  }
}

/** 이 브라우저에 저장된 가장 최근 결과의 id (없으면 null) */
export function latestReportId(): string | null {
  let best: { id: string; at: number } | null = null;
  try {
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (!key?.startsWith("tokbang:report:")) continue;
        try {
          const r = JSON.parse(store.getItem(key) ?? "") as Partial<SavedReport>;
          if (r.id && typeof r.createdAt === "number" && (!best || r.createdAt > best.at)) best = { id: r.id, at: r.createdAt };
        } catch {
          // 깨진 항목은 건너뛴다
        }
      }
    }
  } catch {
    return null;
  }
  return best?.id ?? null;
}

export function newReportId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
