import { z } from "zod";

/**
 * LLM 출력 스키마.
 * Zod로 검증하고, 같은 모양을 OpenAI Structured Outputs(strict)용 JSON Schema로도 넘긴다.
 * strict 모드 규칙: 모든 객체 additionalProperties=false, 모든 속성 required, 없을 수 있는 값은 null.
 */

const quote = z.object({ date: z.string(), who: z.string(), text: z.string() });
export type Quote = z.infer<typeof quote>;

// ── 구간 분석 ────────────────────────────────────────────────
export const chunkNotesSchema = z.object({
  summary: z.string(),
  events: z.array(z.object({ date: z.string(), text: z.string() })),
  members: z.array(
    z.object({
      name: z.string(),
      episodes: z.array(z.string()),
      humor: z.string(),
      stress: z.string(),
      care: z.string(),
      innerVoice: z.string(),
      claimedMbti: z.string().nullable(),
      mbtiClues: z.object({ ei: z.string(), sn: z.string(), tf: z.string(), jp: z.string() }),
      quotes: z.array(quote),
    }),
  ),
  relations: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      kind: z.enum(["tease", "care", "conflict", "romance", "ally", "other"]),
      note: z.string(),
    }),
  ),
  legends: z.array(z.object({ date: z.string(), title: z.string(), text: z.string() })),
  bagHints: z.array(z.object({ name: z.string(), item: z.string(), reason: z.string() })),
});
export type ChunkNotes = z.infer<typeof chunkNotesSchema>;

// ── 종합 리포트 ───────────────────────────────────────────────
const axis = z.object({ letter: z.string(), reason: z.string() });

export const reportSchema = z.object({
  title: z.string(),
  oneLiner: z.string(),
  acts: z.array(z.object({ title: z.string(), period: z.string(), summary: z.string() })),
  members: z.array(
    z.object({
      name: z.string(),
      archetype: z.string(),
      summary: z.string(),
      change: z.string(),
      humor: z.string(),
      stress: z.string(),
      care: z.string(),
      quotes: z.array(quote),
      mbti: z.object({
        type: z.string(),
        confidence: z.number(),
        claimed: z.string().nullable(),
        ei: axis,
        sn: axis,
        tf: axis,
        jp: axis,
      }),
      bag: z.object({
        bag: z.string(),
        items: z.array(z.object({ item: z.string(), reason: z.string() })),
      }),
    }),
  ),
  pairs: z.array(
    z.object({ a: z.string(), b: z.string(), score: z.number(), label: z.string(), reason: z.string() }),
  ),
  awards: z.array(z.object({ title: z.string(), winner: z.string(), reason: z.string() })),
  closing: z.string(),
});
export type Report = z.infer<typeof reportSchema>;

/** Zod 스키마 → OpenAI strict JSON Schema */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const o = { ...(node as Record<string, unknown>) };
    delete o.$schema;
    if (o.type === "object" && o.properties) {
      o.additionalProperties = false;
      o.required = Object.keys(o.properties as object);
    }
    for (const k of Object.keys(o)) o[k] = walk(o[k]);
    return o;
  };
  return walk(json) as Record<string, unknown>;
}
