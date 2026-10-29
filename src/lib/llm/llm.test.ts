import { describe, expect, it } from "vitest";
import { chunkNotesSchema, reportSchema, toStrictJsonSchema } from "./schema";
import { keepKnownQuotes, verifyQuotes } from "./verify";
import { mockChunkNotes, mockReport } from "./mock";

const CHUNK = [
  "7/19 21:00 가나다: 오늘 회사 왜이럼",
  "7/19 21:01 라마바: 퇴근하고 싶다 진짜",
  "  두 번째 줄",
  "7/19 21:02 가나다: (photo)",
].join("\n");

describe("strict JSON schema", () => {
  it("모든 객체가 additionalProperties=false, 모든 속성 required", () => {
    const check = (n: unknown): void => {
      if (Array.isArray(n)) return n.forEach(check);
      if (!n || typeof n !== "object") return;
      const o = n as Record<string, unknown>;
      if (o.type === "object") {
        expect(o.additionalProperties).toBe(false);
        expect((o.required as string[]).sort()).toEqual(Object.keys(o.properties as object).sort());
      }
      Object.values(o).forEach(check);
    };
    check(toStrictJsonSchema(chunkNotesSchema));
    check(toStrictJsonSchema(reportSchema));
  });
});

describe("인용 검증", () => {
  it("원문에 없는 인용은 버린다", () => {
    const notes = mockChunkNotes(CHUNK, ["가나다", "라마바"]);
    notes.members[0].quotes.push({ date: "7/19", who: "가나다", text: "지어낸 말" });
    const { notes: v, dropped } = verifyQuotes(notes, CHUNK);
    expect(dropped).toBe(1);
    expect(v.members[0].quotes.map((q) => q.text)).toEqual(["오늘 회사 왜이럼"]);
  });

  it("종합 단계에서 노트에 없던 인용은 버린다", () => {
    const kept = keepKnownQuotes(
      [{ quotes: [{ date: "1", who: "a", text: "있음" }, { date: "1", who: "a", text: "없음" }] }],
      [{ date: "1", who: "a", text: "있음" }],
    );
    expect(kept[0].quotes).toHaveLength(1);
  });
});

describe("mock", () => {
  it("목업 결과도 스키마를 통과한다", () => {
    const notes = mockChunkNotes(CHUNK, ["가나다", "라마바"]);
    expect(chunkNotesSchema.parse(notes)).toBeTruthy();
    expect(reportSchema.parse(mockReport([notes], ["가나다", "라마바"]))).toBeTruthy();
  });
});
