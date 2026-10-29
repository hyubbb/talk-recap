import "server-only";
import type { z } from "zod";
import { toStrictJsonSchema } from "./schema";

export type Provider = "openai" | "mock";

export interface LlmConfig {
  provider: Provider;
  chunkModel: string;
  synthModel: string;
}

/** 환경변수로 공급자와 모델을 고른다. 키가 없으면 mock. */
export function llmConfig(): LlmConfig {
  const wanted = (process.env.LLM_PROVIDER ?? "openai") as Provider;
  const provider: Provider = wanted === "openai" && process.env.OPENAI_API_KEY ? "openai" : "mock";
  return {
    provider,
    chunkModel: process.env.OPENAI_CHUNK_MODEL ?? "gpt-4.1-mini",
    synthModel: process.env.OPENAI_SYNTH_MODEL ?? "gpt-4.1",
  };
}

export interface JsonCall<T> {
  model: string;
  system: string;
  user: string;
  name: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}

export interface JsonResult<T> {
  data: T;
  usage: { input: number; output: number };
}

/** OpenAI Chat Completions + Structured Outputs(strict) 로 JSON을 받는다. */
export async function callOpenAI<T>(call: JsonCall<T>): Promise<JsonResult<T>> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: call.model,
      messages: [
        { role: "system", content: call.system },
        { role: "user", content: call.user },
      ],
      max_completion_tokens: call.maxTokens ?? 8000,
      response_format: {
        type: "json_schema",
        json_schema: { name: call.name, strict: true, schema: toStrictJsonSchema(call.schema) },
      },
    }),
  });
  if (!res.ok) {
    // 응답 본문에 대화 내용이 들어갈 수 있으므로 에러 메시지만 짧게 남긴다
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new LlmError(res.status, body?.error?.message?.slice(0, 300) ?? res.statusText);
  }
  const json = (await res.json()) as {
    choices: { message: { content: string | null; refusal?: string | null } }[];
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  const msg = json.choices[0]?.message;
  if (!msg?.content) throw new LlmError(422, msg?.refusal ?? "빈 응답");
  const data = call.schema.parse(JSON.parse(msg.content));
  return {
    data,
    usage: { input: json.usage?.prompt_tokens ?? 0, output: json.usage?.completion_tokens ?? 0 },
  };
}

export class LlmError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
