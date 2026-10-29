import { z } from "zod";
import { getSupabase } from "@/lib/supabase/server";
import { isValidSlug } from "@/lib/share/token";
import { notifyReport } from "@/lib/share/realtime";

const err = (error: string, status: number) => Response.json({ error }, { status });

const body = z.object({
  voterKey: z.string().regex(/^[0-9a-f]{32}$/),
  value: z.union([z.literal(1), z.literal(-1)]),
});

/**
 * 인정(1)/기각(-1) 투표. 브라우저별 익명 키로 1인 1표, 다시 누르면 바뀐다.
 * 검증·집계·상태 갱신은 cast_objection_vote 한 번으로 (1초 안 반영을 위해 DB 왕복 최소화).
 */
export async function POST(req: Request, ctx: RouteContext<"/api/share/[id]/objections/[oid]/vote">) {
  const { id, oid } = await ctx.params;
  const db = getSupabase();
  if (!db) return err("공유 기능이 아직 설정되지 않았어요.", 503);
  const parsed = body.safeParse(await req.json().catch(() => null));
  const objectionId = Number(oid);
  if (!parsed.success || !Number.isSafeInteger(objectionId) || !isValidSlug(id)) return err("요청 형식이 올바르지 않아요.", 400);

  const { data, error } = await db.rpc("cast_objection_vote", {
    p_report: id,
    p_objection: objectionId,
    p_voter: parsed.data.voterKey,
    p_value: parsed.data.value,
  });
  if (error) {
    console.error(`[vote] failed: ${error.code}`);
    return err("투표를 저장하지 못했어요.", 500);
  }
  const row = (Array.isArray(data) ? data[0] : data) as { accept_count: number; reject_count: number; new_status: string } | undefined;
  if (!row) return err("반박을 찾을 수 없어요.", 404);
  const result = { id: objectionId, accept: row.accept_count, reject: row.reject_count, status: row.new_status };
  await notifyReport(id, { type: "vote", ...result });
  return Response.json({ result });
}
