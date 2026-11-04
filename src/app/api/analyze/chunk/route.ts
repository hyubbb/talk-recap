import { z } from "zod";
import { checkAnalysisPayment } from "@/lib/pay/gate";
import { callOpenAI, llmConfig, LlmError } from "@/lib/llm/provider";
import { chunkNotesSchema } from "@/lib/llm/schema";
import { chunkPrompt } from "@/lib/llm/prompts";
import { verifyQuotes } from "@/lib/llm/verify";
import { mockChunkNotes } from "@/lib/llm/mock";
import { chunkDatesOk, MAX_CHUNK_BYTES } from "@/lib/pay/usage";

export const maxDuration = 300;

const body = z.object({
  index: z.number().int().min(0),
  total: z.number().int().min(1),
  period: z.string().max(40),
  members: z.array(z.string().max(60)).min(1).max(50),
  text: z.string().min(1).max(MAX_CHUNK_BYTES),
  /** 구간 첫·마지막 메시지 시각 (대화 벽시계 기준 ms) */
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

/**
 * 구간 하나를 분석한다. 대화 원문은 요청 메모리에서만 쓰고 저장·로그하지 않는다.
 */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  const { index, total, period, members, text, start, end } = parsed.data;
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > MAX_CHUNK_BYTES) return Response.json({ error: "구간이 너무 커요." }, { status: 413 });
  if (!chunkDatesOk(text, start, end)) return Response.json({ error: "구간 날짜가 맞지 않아요." }, { status: 400 });
  const denied = await checkAnalysisPayment(req, { kind: "chunk", bytes, start, end });
  if (denied) return denied;
  const cfg = llmConfig();

  try {
    if (cfg.provider === "mock") {
      const notes = mockChunkNotes(text, members);
      return Response.json({ notes, dropped: 0, usage: { input: 0, output: 0 }, provider: "mock" });
    }
    const { data, usage } = await callOpenAI({
      model: cfg.chunkModel,
      system: chunkPrompt({ index, total, period, members }),
      user: text,
      name: "chunk_notes",
      schema: chunkNotesSchema,
      maxTokens: 6000,
    });
    const { notes, dropped } = verifyQuotes(data, text);
    return Response.json({ notes, dropped, usage, provider: "openai" });
  } catch (e) {
    const status = e instanceof LlmError ? e.status : 500;
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    console.error(`[analyze/chunk] #${index} failed: ${status}`);
    return Response.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
