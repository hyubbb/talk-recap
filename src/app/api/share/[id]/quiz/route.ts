import { z } from "zod";
import { getSharedReport, reportExists } from "@/lib/share/repo";
import { getSupabase } from "@/lib/supabase/server";

const err = (error: string, status: number) => Response.json({ error }, { status });

export interface RankRow {
  nickname: string;
  memberName: string | null;
  score: number;
}

async function top10(id: string): Promise<RankRow[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("quiz_scores")
    .select("nickname, member_name, score")
    .eq("report_id", id)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);
  if (error) {
    console.error(`[quiz] rank failed: ${error.code}`);
    return null;
  }
  return (data ?? []).map((r) => ({ nickname: r.nickname, memberName: r.member_name, score: r.score }));
}

/** 방 랭킹 상위 10 */
export async function GET(_req: Request, ctx: RouteContext<"/api/share/[id]/quiz">) {
  const { id } = await ctx.params;
  if (!(await reportExists(id))) return err("공유 링크를 찾을 수 없어요.", 404);
  const rows = await top10(id);
  if (!rows) return err("랭킹을 불러오지 못했어요.", 500);
  return Response.json({ ranking: rows }, { headers: { "cache-control": "no-store" } });
}

const body = z.object({
  nickname: z.string().trim().min(1).max(20),
  memberName: z.string().max(60).nullable(),
  score: z.number().int().min(0).max(100),
});

/** 점수 저장 후 랭킹 반환 */
export async function POST(req: Request, ctx: RouteContext<"/api/share/[id]/quiz">) {
  const { id } = await ctx.params;
  const db = getSupabase();
  if (!db) return err("공유 기능이 아직 설정되지 않았어요.", 503);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("닉네임은 1~20자로 적어 주세요.", 400);
  const shared = await getSharedReport(id);
  if (!shared) return err("공유 링크를 찾을 수 없어요.", 404);
  const { nickname, memberName, score } = parsed.data;
  const member = memberName && shared.saved.members.some((m) => m.name === memberName) ? memberName : null;

  const { error } = await db.from("quiz_scores").insert({ report_id: id, nickname, member_name: member, score });
  if (error) {
    console.error(`[quiz] insert failed: ${error.code}`);
    return err("점수를 저장하지 못했어요.", 500);
  }
  return Response.json({ ranking: (await top10(id)) ?? [] }, { status: 201 });
}
