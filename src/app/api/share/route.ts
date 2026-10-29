import { getSupabase } from "@/lib/supabase/server";
import { hashToken, newDeleteToken, newSlug } from "@/lib/share/token";
import { MAX_SHARE_BYTES, savedReportSchema } from "@/lib/share/schema";

const err = (error: string, status: number) => Response.json({ error }, { status });

/** 결과를 저장하고 공유 링크를 만든다. 삭제 토큰은 이 응답에서 한 번만 돌려준다. */
export async function POST(req: Request) {
  const db = getSupabase();
  if (!db) return err("공유 기능이 아직 설정되지 않았어요.", 503);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_SHARE_BYTES) return err("결과가 너무 커서 공유할 수 없어요.", 413);
  const text = await req.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > MAX_SHARE_BYTES) return err("결과가 너무 커서 공유할 수 없어요.", 413);

  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {}
  const parsed = savedReportSchema.safeParse(json);
  if (!parsed.success) return err("요청 형식이 올바르지 않아요.", 400);
  const saved = parsed.data;

  const deleteToken = newDeleteToken();
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newSlug();
    const { data, error } = await db
      .from("reports")
      .insert({
        id,
        title: saved.report.title.slice(0, 200),
        member_count: saved.members.length,
        payload: saved,
        owner_token_hash: hashToken(deleteToken),
      })
      .select("expires_at")
      .single<{ expires_at: string }>();
    if (!error) {
      const url = `${new URL(req.url).origin}/s/${id}`;
      return Response.json({ id, url, deleteToken, expiresAt: data.expires_at }, { status: 201 });
    }
    if (error.code !== "23505") {
      console.error(`[share] insert failed: ${error.code}`);
      return err("공유 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.", 500);
    }
  }
  return err("공유 링크를 만들지 못했어요. 다시 시도해 주세요.", 500);
}
