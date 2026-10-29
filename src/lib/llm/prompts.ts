/** 모든 단계에 공통으로 붙는 안전·톤 규칙 */
const RULES = `
규칙:
- 대화에 실제로 있는 내용만 쓴다. 추측은 문장 끝에 "(추정)"을 붙인다.
- 인용(quotes)은 대화 원문을 한 글자도 바꾸지 말고 그대로 옮긴다. 날짜는 대화에 찍힌 "M/D" 그대로.
- 분위기는 친구끼리 돌려보는 재밌는 분석. 놀리는 건 좋지만 상처 주는 표현은 쓰지 않는다.
- 다음 내용은 분석·인용·별명·어워드 어디에도 쓰지 않는다: 건강·정신건강·질병, 자해·자살 관련 언급(농담 포함),
  종교, 성적 지향, 성적인 내용, 연애 상대의 실명·사생활, 범죄, 돈 문제(빚·월급 액수), 가족 불화.
- 전화번호·계좌번호처럼 [가려진 정보]는 그대로 둔다.
- 멤버 이름은 대화에 나온 표시 이름을 그대로 쓴다.
- 모든 문장은 한국어.`;

export function chunkPrompt(input: {
  index: number;
  total: number;
  period: string;
  members: string[];
}): string {
  return `너는 카카오톡 단톡방 대화를 읽고 멤버들의 성격과 관계를 분석하는 사람이다.
지금 주는 건 전체 ${input.total}개 구간 중 ${input.index + 1}번째 구간(${input.period})이다.
멤버: ${input.members.join(", ")}
대화 형식: "M/D HH:MM 이름: 내용" (들여쓴 줄은 앞 메시지에 이어지는 줄)

이 구간을 처음부터 끝까지 읽고 아래를 정리해라.
- summary: 이 구간의 흐름 3~5문장
- events: 주요 사건 5~10개 (날짜 포함)
- members: 이 구간에 등장한 멤버마다
  - episodes: 주요 에피소드 2~4개. "누가 뭘 해서 어떻게 됐다"까지 구체적으로 (예: "쌀통 위치를 몰라 밥 짓기에 실패하고 다음 날 큰소리침")
  - humor: 유머 스타일, stress: 스트레스·감정 반응, care: 다른 멤버를 대하는 방식, innerVoice: 속마음이 드러난 순간
  - claimedMbti: 본인이 자기 MBTI를 직접 밝혔으면 그 값(예: "INTJ"), 아니면 null. 남의 MBTI를 말한 건 넣지 않는다.
  - mbtiClues: 각 축(E/I, S/N, T/F, J/P)마다 이 구간에서 보인 근거 한 문장
  - quotes: 그 사람다운 원문 인용 4~6개. 웃긴 말, 명장면 대사, 자주 쓰는 표현, 반응이 컸던 말 위주로 고른다
- relations: 누가 누구를 놀리는지, 챙기는지, 서운해했는지, 썸인지 (kind: tease/care/conflict/romance/ally/other)
- legends: 이 구간의 레전드 장면·유행어 3~5개
- bagHints: 이 사람 가방에 들어 있을 법한 물건 단서 (대화에 나온 물건·취미·습관 근거)
${RULES}`;
}

export function synthPrompt(input: { members: string[]; period: string; statsDigest: string }): string {
  return `너는 단톡방 전체(${input.period})를 구간별로 분석한 노트를 받아 최종 리포트를 쓰는 사람이다.
멤버: ${input.members.join(", ")}

코드로 계산한 정확한 통계 (숫자는 이걸 그대로 쓴다):
${input.statsDigest}

구간 노트를 모두 읽고 아래를 만들어라.
- title: 리포트 제목 (방 분위기가 드러나게, 20자 이내)
- oneLiner: 방 전체를 한 문장으로
- acts: 기간을 3~5막으로 나눈 줄거리 (title, period, summary)
- members: 멤버마다 (사람마다 다르게 보이도록 쓴다. 모두에게 같은 틀의 문장을 쓰지 않는다)
  - archetype: 이 사람을 한 줄로 부르는 별명 같은 아키타입 (예: "퇴사했는데 퇴근 안 하는 사람")
  - oneLiner: 한줄평. 친구가 옆에서 툭 던지는 펀치라인, 30자 이내 (예: "퇴사하고도 단톡방 지분 1위")
  - summary: 이 사람의 포지션 2~3문장, humor: 웃기는 방식 한 문장
  - scenes: 명장면 1~2개. title(짧게), text(무슨 일이 있었는지 구체적으로 2~3문장, 결말까지), quotes(그 장면의 원문 1~3개)
  - sections: 이 사람에게만 붙일 꼭지 2~3개. title은 사람에 맞게 직접 정한다 (예: 생활력, 직장 생존기, 먹부림, 덕질,
    드립 스타일, 약속 잡기, 사진 투척, 새벽 감성). text는 구체적인 일화 2~3문장, quotes는 근거 원문 1~2개 (반드시 1개 이상).
    다른 멤버와 같은 제목은 피한다. 연애·썸·플러팅 관련 꼭지는 만들지 않는다.
  - quotes: 노트에 있는 인용 중 가장 그 사람다운 5개 (본인이 한 말만)
  - mbti: 본인이 밝힌 값이 있으면 claimed에 넣고, 행동 근거로 축마다 letter와 reason을 정한 뒤 type과 confidence(0~1)를 정한다.
    본인 주장과 추론이 다르면 그 차이를 reason에 재밌게 짚는다.
  - bag: 이 사람이 들 가방 종류와 안에 든 물건 8~10개, 물건마다 대화 근거
- pairs: 멤버 쌍마다 궁합 점수(0~100), 관계를 한 단어로(label), 이유
- awards: 부문별 어워드 6~8개 (유행어상, 눈물상 같은 식. 통계 근거가 있으면 숫자를 쓴다)
  - quotes: 수상 이유가 보이는 수상자 본인의 원문 1~2개
- closing: 총평 2~3문장
- 모든 quotes는 노트에 있는 인용을 원문 그대로 옮긴다 (date, who, text). 노트에 없는 인용은 만들지 않는다.
${RULES}`;
}
