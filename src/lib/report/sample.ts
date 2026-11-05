import { normalizeSaved, saveReport, type SavedReport } from "./storage";

/**
 * 샘플 결과: 지어낸 샘플 대화(public/sample-kakao.txt)로 미리 만들어 둔 결과(public/sample-report.json).
 * AI를 새로 돌리지 않고 결제 없이 보여준다. 이 브라우저 저장소에 id "sample"로 넣고 /r/sample로 연다.
 * '지난 결과' 목록에서는 빠진다.
 */
export const SAMPLE_ID = "sample";

export async function installSampleReport(): Promise<void> {
  const res = await fetch("/sample-report.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("샘플 결과를 불러오지 못했어요.");
  const saved = normalizeSaved((await res.json()) as SavedReport);
  saveReport({ ...saved, id: SAMPLE_ID });
}
