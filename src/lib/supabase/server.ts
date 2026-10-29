import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/** 공유 기능이 켜져 있는지 (SUPABASE_URL, SUPABASE_SECRET_KEY가 모두 있을 때) */
export function shareEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/** 서버 전용 Supabase 클라이언트. 환경변수가 없으면 null. */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return cached;
}

export interface ReportRow {
  id: string;
  created_at: string;
  expires_at: string;
  title: string;
  member_count: number;
  payload: unknown;
  view_count: number;
}
