import "server-only";
import { connection } from "next/server";
import { getSupabase, type ReportRow } from "@/lib/supabase/server";
import { isValidSlug } from "./token";
import { normalizeSaved, type SavedReport } from "@/lib/report/storage";

export interface SharedReport {
  saved: SavedReport;
  expiresAt: string;
}

/** 공유된 결과를 읽는다. 없거나 만료됐거나 공유 기능이 꺼져 있으면 null. */
export async function getSharedReport(id: string): Promise<SharedReport | null> {
  // 만료·삭제를 바로 반영해야 하니 항상 요청 시점에 읽는다
  await connection();
  if (!isValidSlug(id)) return null;
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("reports")
    .select("id, expires_at, payload")
    .eq("id", id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<Pick<ReportRow, "id" | "expires_at" | "payload">>();
  if (error) {
    console.error(`[share] read failed: ${error.code}`);
    return null;
  }
  if (!data) return null;
  return { saved: normalizeSaved(data.payload as SavedReport), expiresAt: data.expires_at };
}

export async function incrementView(id: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  const { error } = await db.rpc("increment_report_view", { p_id: id });
  if (error) console.error(`[share] view count failed: ${error.code}`);
}

/** 공유가 살아 있는지만 확인 (payload는 읽지 않는다) */
export async function reportExists(id: string): Promise<boolean> {
  await connection();
  if (!isValidSlug(id)) return false;
  const db = getSupabase();
  if (!db) return false;
  const { data, error } = await db.from("reports").select("id").eq("id", id).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) console.error(`[share] exists failed: ${error.code}`);
  return !!data;
}
