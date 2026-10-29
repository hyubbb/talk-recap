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

/** 업로드 화면 "지난 결과" 목록에 쓰는 요약 */
export interface ReportSummary {
  id: string;
  createdAt: number;
  title: string;
  start: number;
  end: number;
  memberCount: number;
}

/** 이 브라우저에 저장된 결과 요약, 최근 순 */
export function listReports(limit = 5): ReportSummary[] {
  const out: ReportSummary[] = [];
  const seen = new Set<string>();
  try {
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (!key?.startsWith("tokbang:report:")) continue;
        try {
          const r = JSON.parse(store.getItem(key) ?? "") as Partial<SavedReport>;
          if (!r.id || typeof r.createdAt !== "number" || seen.has(r.id)) continue;
          seen.add(r.id);
          out.push({
            id: r.id,
            createdAt: r.createdAt,
            title: r.report?.title ?? "우리 방 리포트",
            start: r.stats?.start ?? 0,
            end: r.stats?.end ?? 0,
            memberCount: r.members?.length ?? 0,
          });
        } catch {
          // 깨진 항목은 건너뛴다
        }
      }
    }
  } catch {
    return [];
  }
  return out.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export function newReportId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
