import { getSupabase } from "@/lib/supabase/server";

/**
 * Vercel Cron이 하루 한 번 부른다. Supabase Free 플랜의 7일 비활성 일시중지를 막는다.
 * Vercel은 CRON_SECRET이 있으면 `Authorization: Bearer <CRON_SECRET>` 헤더를 붙여 보낸다.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getSupabase();
  if (!db) return Response.json({ ok: false, reason: "supabase not configured" }, { status: 503 });
  const { error, count } = await db.from("reports").select("id", { count: "exact", head: true });
  if (error) {
    console.error(`[cron/ping] failed: ${error.code}`);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true, reports: count ?? 0 });
}
