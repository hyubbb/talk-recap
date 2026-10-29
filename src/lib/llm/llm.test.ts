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

describe("verifyReport", () => {
  it("멤버 인용은 본인 말·최대 5개, 근거 없는 꼭지는 버리고, 어워드는 수상자 말만", async () => {
    const { verifyReport } = await import("./verify");
    const { fakeReport } = await import("../testing/fakeReport");
    const r = fakeReport(2, 7).report;
    const known = r.members.flatMap((m) => [...m.quotes, ...m.scenes.flatMap((b) => b.quotes)]);
    known.push(r.awards[0].quotes[0]);
    r.members[0].quotes.push({ date: "7/1", who: r.members[1].name, text: r.members[1].quotes[0].text });
    const v = verifyReport(r, known);
    expect(v.members[0].quotes).toHaveLength(5);
    expect(v.members[0].quotes.every((q) => q.who === r.members[0].name)).toBe(true);
    expect(v.members[0].scenes).toHaveLength(1);
    expect(v.members[0].sections).toHaveLength(0); // 꼭지 근거는 known에 없음
    expect(v.awards[0].quotes).toHaveLength(1);
    const other = { ...r, awards: [{ ...r.awards[0], quotes: [r.members[1].quotes[0]] }] };
    expect(verifyReport(other, known).awards[0].quotes).toHaveLength(0);
  });
});
