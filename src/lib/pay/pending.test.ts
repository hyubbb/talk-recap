import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearPending, finishPending, listUnfinished, loadPending, loadProgress, saveChunkProgress, savePending, saveSynthProgress } from "./pending";
import type { ChunkNotes, Report } from "../llm/schema";
import { fakeReport } from "../testing/fakeReport";

// 지어낸 주문·대화
const notes = (title: string) => ({ legends: [{ title }] }) as unknown as ChunkNotes;
const chunk = (index: number, total = 3) => ({ index, total, notes: notes(`장면 ${index}`), dropped: 1, usage: { input: 10, output: 5 }, provider: "mock" });
const pending = (orderNo: string) => ({
  orderNo,
  secret: "비밀",
  files: [new File(["2026. 7. 19. 오후 5:03, 도토리 : 흠"], "가짜.txt")],
  groups: [],
  aliases: {},
  range: null,
});

describe("결제한 분석 이어 하기", () => {
  beforeEach(async () => {
    vi.useRealTimers();
    for (const o of ["A1", "B2"]) await clearPending(o);
  });

  it("끝낸 구간과 종합을 남기고 다시 읽는다", async () => {
    await savePending(pending("A1"));
    await saveChunkProgress("A1", chunk(0));
    await saveChunkProgress("A1", chunk(2));
    const p = await loadProgress("A1", 3);
    expect(p.chunks.map((c) => c.index).sort()).toEqual([0, 2]);
    expect(p.synth).toBeNull();

    const report = fakeReport(2).report as Report;
    await saveSynthProgress("A1", { total: 3, dropped: 2, report, usage: { input: 30, output: 15 }, provider: "mock" });
    expect((await loadProgress("A1", 3)).synth?.report.title).toBe(report.title);
  });

  it("구간 수가 달라지면(설정이 바뀜) 기록을 쓰지 않는다", async () => {
    await saveChunkProgress("A1", chunk(0, 3));
    const report = fakeReport(1).report as Report;
    await saveSynthProgress("A1", { total: 3, dropped: 0, report, usage: { input: 0, output: 0 }, provider: "mock" });
    const p = await loadProgress("A1", 4);
    expect(p.chunks).toEqual([]);
    expect(p.synth).toBeNull();
  });

  it("다른 주문의 기록은 섞이지 않는다", async () => {
    await saveChunkProgress("A1", chunk(0));
    await saveChunkProgress("B2", chunk(1));
    expect((await loadProgress("A1", 3)).chunks.map((c) => c.index)).toEqual([0]);
  });

  it("끝나면 대화·진행 기록은 지우고 결과 id만 남긴다, 끝난 건 이어 하기 목록에서 빠진다", async () => {
    await savePending(pending("A1"));
    await savePending(pending("B2"));
    await saveChunkProgress("A1", chunk(0));
    expect((await listUnfinished()).map((p) => p.orderNo).sort()).toEqual(["A1", "B2"]);

    await finishPending("A1", "report-1");
    const done = await loadPending("A1");
    expect(done?.reportId).toBe("report-1");
    expect(done?.files).toEqual([]);
    expect(done?.secret).toBe("비밀");
    expect((await loadProgress("A1", 3)).chunks).toEqual([]);
    expect((await listUnfinished()).map((p) => p.orderNo)).toEqual(["B2"]);
  });

  it("오래된(2.5시간 넘은) 결제 대화는 버린다", async () => {
    await savePending(pending("A1"));
    await saveChunkProgress("A1", chunk(0));
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 3 * 60 * 60 * 1000);
    expect(await listUnfinished()).toEqual([]);
    expect((await loadProgress("A1", 3)).chunks).toEqual([]);
    expect(await loadPending("A1")).toBeNull();
  });
});
