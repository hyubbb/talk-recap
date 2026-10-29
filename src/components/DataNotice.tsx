/**
 * 대화 데이터가 어디로 가는지 안내. 랜딩과 결과 화면(공유 링크 만들기)에서 같은 문구를 쓴다.
 * 실제 동작과 다르게 바뀌면 이 문구도 같이 고친다 (docs/ARCHITECTURE.md 데이터 흐름).
 */
const STEPS = [
  {
    title: "파일 올리기",
    body: "대화 파일은 내 브라우저 안에서만 읽어요. 서버로 보내지 않고, 저장하지도 않아요.",
  },
  {
    title: "AI 분석",
    body: "전화번호·계좌번호 같은 정보를 브라우저에서 먼저 가린 뒤, 대화를 구간별로 나눠 AI(OpenAI)에 보내요. 서버는 분석하는 동안 메모리에서만 쓰고 기록을 남기지 않아요.",
  },
  {
    title: "결과 보기",
    body: "결과는 이 브라우저에만 저장돼요. 다른 사람은 볼 수 없어요. 근거 대화의 앞뒤 2줄씩도 문맥을 보여주려고 같이 저장돼요.",
  },
  {
    title: "공유 링크 만들기 (선택)",
    body: "이때만 결과가 서버에 30일 동안 저장돼요. 근거 대화와 그 앞뒤 몇 줄은 포함되지만, 대화 파일 전체는 올라가지 않아요. 공유 중지를 누르면 바로 지워져요.",
  },
];

/** 공유하면 서버에 남는 것. 원문 일부가 포함된다는 점을 숨기지 않는다 */
const STORED = [
  "AI 분석 결과(줄거리, 멤버 분석, MBTI, 궁합, 어워드, 가방)",
  "숫자 통계(메시지 수, 시간대, 답장 횟수 등)와 멤버 이름",
  "근거로 붙은 원문 인용과 그 앞뒤 2줄씩(문맥 보기용, 전화번호 등은 가린 채로)",
  "말버릇 문구와 그 말을 쓴 장면 앞뒤 2줄씩, 가장 긴 메시지 앞부분(40자)",
  "링크로 들어온 사람이 남긴 퀴즈 기록, 반박, 투표",
];

export function DataNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <details className="mt-3 rounded-[14px] bg-dusk-2 px-4 py-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-haze">공유하면 서버에 무엇이 남나요?</summary>
        <StoredList />
      </details>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-[var(--radius-card)] bg-dusk p-4">
            <span className="font-pixel tabular mt-0.5 w-5 shrink-0 text-spark">{i + 1}</span>
            <div>
              <p className="text-[15px] font-bold">{s.title}</p>
              <p className="mt-1 text-[14px] leading-[1.6] text-haze">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <details className="rounded-[var(--radius-card)] bg-dusk px-4 py-3">
        <summary className="cursor-pointer text-[14px] font-semibold">공유하면 서버에 무엇이 남나요?</summary>
        <StoredList />
      </details>
    </div>
  );
}

function StoredList() {
  return (
    <>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[13px] leading-[1.6] text-haze">
        {STORED.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="mt-2 text-[13px] leading-[1.6] text-haze">
        링크는 추측할 수 없는 주소라서 받은 사람만 열 수 있고, 검색에 나오지 않아요. 30일이 지나면 자동으로 지워져요.
      </p>
    </>
  );
}
