import { z } from "zod";
import { getSharedReport, reportExists } from "@/lib/share/repo";
import { getSupabase } from "@/lib/supabase/server";
import { canObject, MAX_OBJECTION_CHARS } from "@/lib/objection/rules";
import { notifyReport } from "@/lib/share/realtime";

const err = (error: string, status: number) => Response.json({ error }, { status });

export interface ObjectionItem {
  id: number;
  target: string;
  memberName: string;
  body: string;
  status: "open" | "accepted" | "rejected";
  accept: number;
  reject: number;
  myVote: -1 | 0 | 1;
}

/** 반박 목록 + 투표 집계. x-voter-key 헤더가 있으면 내 표도 같이 */
export async function GET(req: Request, ctx: RouteContext<"/api/share/[id]/objections">) {
  const { id } = await ctx.params;
  const db = getSupabase();
  if (!db) return err("공유 기능이 아직 설정되지 않았어요.", 503);
  if (!(await reportExists(id))) return err("공유 링크를 찾을 수 없어요.", 404);

  const { data, error } = await db
    .from("objections")
    .select("id, target, member_name, body, status, votes(value, voter_key)")
    .eq("report_id", id)
    .order("created_at", { ascending: true });
  if (error) {
    console.error(`[objections] list failed: ${error.code}`);
    return err("잠시 후 다시 시도해 주세요.", 500);
  }
  const voter = req.headers.get("x-voter-key");
  const items: ObjectionItem[] = (data ?? []).map((o) => {
    const votes = (o.votes ?? []) as { value: number; voter_key: string }[];
    const mine = voter ? votes.find((v) => v.voter_key === voter)?.value : undefined;
    return {
      id: o.id,
      target: o.target,
      memberName: o.member_name,
      body: o.body,
      status: o.status,
      accept: votes.filter((v) => v.value === 1).length,
      reject: votes.filter((v) => v.value === -1).length,
      myVote: (mine === 1 || mine === -1 ? mine : 0) as ObjectionItem["myVote"],
    };
  });
  return Response.json({ items }, { headers: { "cache-control": "no-store" } });
}

const body = z.object({
  target: z.string().min(3).max(80),
  memberName: z.string().min(1).max(60),
  body: z.string().trim().min(1).max(MAX_OBJECTION_CHARS),
});

/** 한 줄 반박 (항목당 멤버 1회) */
export async function POST(req: Request, ctx: RouteContext<"/api/share/[id]/objections">) {
  const { id } = await ctx.params;
  const db = getSupabase();
  if (!db) return err("공유 기능이 아직 설정되지 않았어요.", 503);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(`반박은 1~${MAX_OBJECTION_CHARS}자로 적어 주세요.`, 400);
  const shared = await getSharedReport(id);
  if (!shared) return err("공유 링크를 찾을 수 없어요.", 404);
  const { target, memberName } = parsed.data;
  if (!canObject(shared.saved.report, target, memberName)) return err("이 항목의 당사자만 반박할 수 있어요.", 403);

  const { data, error } = await db
    .from("objections")
    .insert({ report_id: id, target, member_name: memberName, body: parsed.data.body })
    .select("id, target, member_name, body, status")
    .single<{ id: number; target: string; member_name: string; body: string; status: string }>();
  if (error?.code === "23505") return err("이 항목에는 이미 반박했어요.", 409);
  if (error || !data) {
    console.error(`[objections] insert failed: ${error?.code}`);
    return err("반박을 저장하지 못했어요.", 500);
  }
  const item = { id: data.id, target: data.target, memberName: data.member_name, body: data.body, status: data.status };
  await notifyReport(id, { type: "objection", item });
  return Response.json({ item }, { status: 201 });
}
