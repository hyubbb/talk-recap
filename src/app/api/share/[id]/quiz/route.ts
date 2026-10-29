import { z } from "zod";
import { getSharedReport, reportExists } from "@/lib/share/repo";
import { getSupabase } from "@/lib/supabase/server";
import { scoreOf } from "@/lib/quiz/build";
import { bestPerNickname, cleanNickname, NICKNAME_MAX, type RankRow } from "@/lib/quiz/ranking";

export type { RankRow } from "@/lib/quiz/ranking";

const err = (error: string, status: number) => Response.json({ error }, { status });

// 0003 마이그레이션(correct/total 컬럼) 적용 전이면 "column does not exist" 계열 에러가 난다
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);

type Row = {
  nickname: string;
  member_name: string | null;
  score: number;
  created_at: string;
  correct?: number | null;
  total?: number | null;
};

/** 방의 퀴즈 결과 (닉네임별 최고 기록, 최대 20명) */
async function ranking(id: string): Promise<RankRow[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const query = (cols: string) =>
    db
      .from("quiz_scores")
      .select(cols)
      .eq("report_id", id)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(200);

  let res = await query("nickname, member_name, score, created_at, correct, total");
  if (res.error && MISSING_COLUMN.has(res.error.code)) res = await query("nickname, member_name, score, created_at");
  if (res.error) {
    console.error(`[quiz] rank failed: ${res.error.code}`);
    return null;
  }
  const rows = ((res.data ?? []) as unknown as Row[]).map((r) => ({
    nickname: r.nickname,
    memberName: r.member_name,
    score: r.score,
    correct: r.correct ?? null,
    total: r.total ?? null,
    createdAt: r.created_at,
  }));
  return bestPerNickname(rows, 20);
}

/** 방 퀴즈 결과 목록 */
export async function GET(_req: Request, ctx: RouteContext<"/api/share/[id]/quiz">) {
  const { id } = await ctx.params;
  if (!(await reportExists(id))) return err("공유 링크를 찾을 수 없어요.", 404);
  const rows = await ranking(id);
  if (!rows) return err("결과를 불러오지 못했어요.", 500);
  return Response.json({ ranking: rows }, { headers: { "cache-control": "no-store" } });
}

const body = z
  .object({
    nickname: z.string().min(1).max(60),
    memberName: z.string().max(60).nullable(),
    correct: z.number().int().min(0).max(50),
    total: z.number().int().min(1).max(50),
  })
  .refine((b) => b.correct <= b.total);

/** 결과 저장 후 목록 반환. 점수는 서버가 맞힌 개수로 계산한다. */
export async function POST(req: Request, ctx: RouteContext<"/api/share/[id]/quiz">) {
  const { id } = await ctx.params;
  const db = getSupabase();
  if (!db) return err("공유 기능이 아직 설정되지 않았어요.", 503);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("결과 형식이 올바르지 않아요.", 400);
  const nickname = cleanNickname(parsed.data.nickname);
  if (!nickname) return err(`이름은 1~${NICKNAME_MAX}자로 적어 주세요.`, 400);
  const shared = await getSharedReport(id);
  if (!shared) return err("공유 링크를 찾을 수 없어요.", 404);
  const { memberName, correct, total } = parsed.data;
  const member = memberName && shared.saved.members.some((m) => m.name === memberName) ? memberName : null;
  const score = scoreOf(correct, total);

  const base = { report_id: id, nickname, member_name: member, score };
  let { error } = await db.from("quiz_scores").insert({ ...base, correct, total });
  if (error && MISSING_COLUMN.has(error.code)) ({ error } = await db.from("quiz_scores").insert(base));
  if (error) {
    console.error(`[quiz] insert failed: ${error.code}`);
    return err("결과를 저장하지 못했어요.", 500);
  }
  return Response.json({ ranking: (await ranking(id)) ?? [] }, { status: 201 });
}
