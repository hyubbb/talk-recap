import { getSupabase } from "@/lib/supabase/server";
import { isValidSlug, verifyToken } from "@/lib/share/token";

const err = (error: string, status: number) => Response.json({ error }, { status });

/** 삭제 토큰(헤더 x-delete-token)이 맞으면 공유를 중지(삭제)한다. */
export async function DELETE(req: Request, ctx: RouteContext<"/api/share/[id]">) {
  const db = getSupabase();
  if (!db) return err("공유 기능이 아직 설정되지 않았어요.", 503);
  const { id } = await ctx.params;
  if (!isValidSlug(id)) return err("공유 링크를 찾을 수 없어요.", 404);

  const { data, error } = await db
    .from("reports")
    .select("owner_token_hash")
    .eq("id", id)
    .maybeSingle<{ owner_token_hash: string }>();
  if (error) {
    console.error(`[share] lookup failed: ${error.code}`);
    return err("잠시 후 다시 시도해 주세요.", 500);
  }
  if (!data) return err("공유 링크를 찾을 수 없어요.", 404);
  if (!verifyToken(req.headers.get("x-delete-token"), data.owner_token_hash)) {
    return err("삭제 권한이 없어요.", 403);
  }

  const del = await db.from("reports").delete().eq("id", id);
  if (del.error) {
    console.error(`[share] delete failed: ${del.error.code}`);
    return err("삭제하지 못했어요. 다시 시도해 주세요.", 500);
  }
  return new Response(null, { status: 204 });
}
