/** 일부 구간만 성공했다면 종합 리포트를 만들지 않는다. */
export function requireCompleteChunks<T>(notes: (T | null)[]): T[] {
  const complete = notes.filter((note): note is T => note !== null);
  if (complete.length === 0) throw new Error("모든 구간 분석이 실패했어요. API 키와 크레딧을 확인해 주세요.");
  if (complete.length !== notes.length) {
    throw new Error(`${notes.length - complete.length}개 구간 분석이 실패했어요. 다시 시도하면 실패한 구간부터 이어서 분석해요.`);
  }
  return complete;
}
