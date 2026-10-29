import { z } from "zod";
import { callOpenAI, llmConfig, LlmError } from "@/lib/llm/provider";
import { chunkNotesSchema, reportSchema } from "@/lib/llm/schema";
import { synthPrompt } from "@/lib/llm/prompts";
import { keepKnownQuotes } from "@/lib/llm/verify";
import { mockReport } from "@/lib/llm/mock";

export const maxDuration = 300;

const body = z.object({
  period: z.string().max(40),
  members: z.array(z.string().max(60)).min(1).max(50),
  statsDigest: z.string().max(20_000),
  notes: z.array(chunkNotesSchema).min(1).max(200),
});

/** 구간 노트들을 하나의 최종 리포트로 합친다. 원문은 받지 않는다. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  const { period, members, statsDigest, notes } = parsed.data;
  const cfg = llmConfig();

  try {
    if (cfg.provider === "mock") {
      return Response.json({ report: mockReport(notes, members), usage: { input: 0, output: 0 }, provider: "mock" });
    }
    const { data, usage } = await callOpenAI({
      model: cfg.synthModel,
      system: synthPrompt({ members, period, statsDigest }),
      user: JSON.stringify(notes),
      name: "room_report",
      schema: reportSchema,
      maxTokens: 16000,
    });
    const known = notes.flatMap((n) => n.members.flatMap((m) => m.quotes));
    const report = { ...data, members: keepKnownQuotes(data.members, known) };
    return Response.json({ report, usage, provider: "openai" });
  } catch (e) {
    const status = e instanceof LlmError ? e.status : 500;
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    console.error(`[analyze/synthesize] failed: ${status}`);
    return Response.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
