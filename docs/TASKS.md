# 남은 작업

한 번에 하나씩 가져가서 작업한다. 각 작업은 완료 기준을 모두 만족하고 `npm test`, `npm run lint`, `npm run build`가 통과해야 끝이다.
UI는 키 없이 mock 모드로 확인할 수 있다. 실제 대화 파일은 커밋하지 않는다 (`AGENTS.md` 절대 규칙).

권장 순서: T1 → T4 → T3 → T2 → T6 → T5 → T7 → T8 → T9 → T10

진행 상황 (2026-10-29): T1~T9 완료, T10(실제 분석 결과로 프롬프트 튜닝)만 남음. 구현 메모는 각 작업 끝의 "구현" 항목 참고.

---

## T1. 공유 링크 (Supabase 저장) — 완료

결과를 서버에 저장하고 짧은 링크로 공유한다. 선행: `docs/SETUP.md`대로 Supabase 테이블 생성, 환경변수 설정.

- `src/lib/supabase/server.ts`: `@supabase/supabase-js`로 서버 전용 클라이언트 (`import "server-only"`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`). 환경변수가 없으면 공유 기능을 끄고 UI에 안내.
- `POST /api/share`: 본문 = `SavedReport`(`src/lib/report/storage.ts`). Zod로 검증, 크기 상한 500KB.
  - id: `crypto.randomBytes`로 12자 이상 base62 슬러그
  - 삭제 토큰을 만들어 응답에 한 번만 돌려주고, DB에는 sha256 해시만 저장(`owner_token_hash`)
  - 응답 `{ id, url, deleteToken, expiresAt }`. 업로더 브라우저 localStorage에 `deleteToken` 보관
- `DELETE /api/share/[id]`: 헤더의 삭제 토큰 해시가 맞으면 삭제
- `/s/[id]` 페이지: 서버에서 `reports`를 읽어 `ReportView`로 렌더. 만료·없음이면 안내 화면. `increment_report_view` 호출
  - cacheComponents 켜져 있음: 동적 params는 `<Suspense>` 안에서 읽는다 (`src/app/r/[id]/page.tsx` 참고)
  - `export const metadata`에 `robots: { index: false, follow: false }`
- 결과 화면(`/r/[id]`)에 "공유 링크 만들기" 버튼 → 생성 후 "링크 복사", 만료일 표시, "공유 중지(삭제)" 버튼
- `/s/[id]/opengraph-image.tsx`: 방 제목, 기간, 메시지 수, 멤버 색 점으로 카톡 미리보기 이미지 (`next/og`). 인용 문장은 넣지 않는다
- Vercel Cron(`vercel.json`) 하루 1번 Supabase 핑 (Free 플랜 7일 비활성 일시중지 방지). 엔드포인트는 `CRON_SECRET` 헤더 확인

완료 기준: 로컬에서 mock 분석 → 링크 생성 → 시크릿 창에서 `/s/[id]` 열림 → 삭제 후 404 안내. 슬러그·토큰 생성과 검증에 단위 테스트.
- 구현: `src/lib/share/`, `src/app/api/share/`, `/s/[id]`. 슬러그 14자 base62

## T2. 스토리 슬라이드 — 완료

결과에 들어오면 9:16 슬라이드 12장을 먼저 보여준다 (`docs/PRD.md` 스토리 순서).

- `src/components/story/`: 슬라이드 컨테이너(탭 좌/우로 이전·다음, 상단 진행 막대, 스와이프, 키보드 ←/→, 닫기 → 리포트로)
- 데이터: `SavedReport`의 `stats`(숫자)와 `report`(해석). 숫자는 반드시 stats에서
- 슬라이드마다 배경 단색을 바꿔 리듬을 만든다(멤버 색 또는 spark). 한 장에 큰 숫자 하나 + 한 줄
- 숨은 기록 슬라이드: `stats.hidden`. 새벽 독백은 내용 없이 시간·개수만
- 마지막 장: 총평 + "리포트 보기" + "퀴즈 시작" + (T1 이후) "공유"
- 수위 높은 궁합·놀림 카드는 넣지 않는다

완료 기준: 모바일 390×844에서 12장 모두 넘겨지고, reduced motion에서 전환 애니메이션 없음, 스크린리더로 각 장 제목 읽힘.
- 구현: `src/lib/story/slides.ts`(순서·배경색, 테스트), `src/components/story/`. 멤버 아키타입은 1인 1장이라 4인 방이면 15장. 업로더(`/r`)와 공유 링크(`/s`) 모두 스토리부터 시작

## T3. "이 말 누가 했게?" 퀴즈 — 완료

- 출제(코드, LLM 없음): 리포트 멤버들의 `quotes`에서 10문제. 보기는 방 멤버 이름 4개(멤버가 4명 미만이면 전원). 같은 사람 문제가 3개를 넘지 않게. 통계 문제 2~3개 섞기("'흠'을 1,175번 친 사람은?")
- 민감 단어 필터를 통과한 인용만. 너무 짧은 인용(4자 미만) 제외
- 화면 `/s/[id]/quiz` (T1 이후. 그 전엔 `/r/[id]/quiz`): 한 문제씩, 답하면 정답과 원문 날짜 공개, 끝나면 점수 카드
- 점수 저장 `POST /api/share/[id]/quiz` → `quiz_scores`, 방 랭킹 상위 10 표시. 닉네임 1~20자
- 본인 인용 문제는 "자기 말 맞히기" 배지

완료 기준: 출제 함수 단위 테스트(중복 없음, 보기에 정답 포함, 인원 적은 방 처리), 랭킹 저장·조회 동작.
- 구현: `src/lib/quiz/build.ts`(시드 고정 출제, 테스트), `src/lib/quiz/sensitive.ts`(민감 단어), `/s/[id]/quiz`(랭킹 저장), `/r/[id]/quiz`(미리 풀기, 저장 없음)

## T4. 내 카드 뽑기 — 완료

- 공유 링크 첫 화면 `/s/[id]`에 "나는 누구?" 멤버 이름 버튼 → 선택하면 카드가 뒤집히며 아키타입 → MBTI → 가방 순서로 공개 → 이후 스토리로 이동
- 선택한 이름은 그 브라우저 localStorage에만 저장(본인 확인 없음). 다음 방문 땐 바로 스토리
- 카드 뒤집기는 CSS 3D transform 한 번. reduced motion이면 페이드
- "구경만 할게요" 선택지도 둔다

완료 기준: 이름 선택 → 카드 공개 → 스토리 진입, 재방문 시 건너뜀.
- 구현: `src/components/share/PickMe.tsx`, `SharedExperience.tsx`. 고른 이름은 `talk-recap:me:{공유id}`에 저장, "바꾸기" 버튼으로 다시 고름

## T5. What's in my bag 픽셀 카드 — 완료

- 리포트 `members[].bag`(가방 종류 + 물건 8~10개)를 픽셀 일러스트 카드로 렌더
- 일반 물건 픽셀 아이콘 세트(휴대폰, 노트북, 이어폰, 지갑, 컵라면, 음료, 책, 우산, 운동화 등 30~40개)를 SVG 또는 스프라이트로 만들고, 물건 이름 키워드로 매칭. 매칭 안 되면 기본 상자 아이콘
- 상표 로고 사용 금지. 라벨은 Galmuri
- 1080×1350 카드 비율

완료 기준: mock 리포트로 멤버별 카드가 렌더되고, 키워드 매칭 테이블에 단위 테스트.
- 구현: `src/lib/bag/icons.ts`(10×10 픽셀 아이콘 38종 + 키워드 표, 테스트), `src/components/bag/BagCard.tsx`

## T6. 카드 이미지 저장 — 완료 (모바일 사파리 실기기 확인은 남음)

- 스토리 슬라이드와 멤버 카드, 가방 카드를 PNG로 저장하는 버튼
- 1080×1920(스토리), 1080×1350(피드). 구석에 서비스 이름 워터마크
- 방법은 `html-to-image` 같은 클라이언트 렌더 또는 `next/og` 서버 렌더 중 택1. 한글 폰트가 깨지지 않게 Pretendard/Galmuri를 임베드
- 모바일 사파리에서 저장(다운로드 또는 공유 시트) 확인
- 구현: `html-to-image` 클라이언트 렌더(`src/lib/ui/savePng.ts`). 폰트 @font-face를 임베드하고 캔버스 크기를 1080×1920 / 1080×1350으로 고정. 모바일은 공유 시트, 실패하면 다운로드. 데스크톱에서 크기·한글 확인함

## T7. 반박권 + 실시간 투표 — 완료

- 리포트의 멤버 분석·MBTI·어워드 항목마다 "이의 있음" 버튼(그 항목의 당사자만, T4에서 고른 이름 기준)
- 한 줄(200자) 반박 → `objections`. 다른 사람들이 인정/기각 투표 → `votes`(브라우저별 익명 키, 1인 1표)
- 과반이 인정하면 "반박 성공" 도장
- 실시간 반영: Supabase Realtime(Postgres Changes 또는 Broadcast, 채널 `report:{id}`). 이때는 publishable 키와 읽기 전용 RLS 정책이 필요하니 마이그레이션 `0002_realtime.sql`을 새로 만든다(쓰기는 계속 서버 API만)

완료 기준: 두 브라우저에서 투표하면 서로의 화면에 1초 안에 반영.
- 구현: Realtime **Broadcast** 방식. 서버 API가 쓰고 나서 `report:{id}` 채널로 바뀐 집계를 보내고, 브라우저는 publishable 키로 받기만 한다(테이블 공개 정책 없음). 투표는 `cast_objection_vote` RPC 한 번으로 검증·집계. 로컬 측정: 투표 요청부터 다른 화면 반영까지 0.7~0.8초(DB 뭄바이). Vercel 함수 지역을 `bom1`로 맞춤

## T8. 이미지 생성 프롬프트 — 완료

- 멤버별 "얼굴(웹툰체)", "방(아이소메트릭)", "가방(픽셀)" 프롬프트를 복사 버튼으로 제공
- 종합 단계 스키마에 `prompts` 필드를 추가하거나, 리포트 데이터로 코드 템플릿을 채운다. 실존 인물처럼 보이는 사실적 묘사는 피하고 캐리커처 스타일 고정
- 단체 사진 프롬프트 1개
- 구현: `src/lib/imagePrompt/build.ts`(코드 템플릿, 이름·인용 미포함 테스트), 리포트 "이미지 만들기 프롬프트" 섹션. 이미지 생성 API는 호출하지 않음

## T9. 형식 검증과 파서 보강 — 완료

- 실제 PC(윈도우·맥) 내보내기, 안드로이드, 영문 설정 내보내기 샘플을 **지어낸 내용으로 재현**해서 `parse.test.ts`에 추가
- 해석 못 한 줄이 1% 넘으면 `/new`에 "형식 제보" 안내(문제 줄 3개를 이름 가린 채 복사)
- 구현: `formats.test.ts`(윈도우·맥 24시간제·안드로이드·iOS 영문(U+202F)·안드로이드 영문·PC 영문). PC 영문 날짜선과 `[5:03 PM]`, 24시간제 PC 시각을 파서에 추가. 해석 못 한 줄 1% 초과 시 `/new`에 형식 제보(`src/lib/kakao/formatReport.ts`)

## T10. 프롬프트·품질 튜닝

- 실제 분석 결과를 보고 `src/lib/llm/prompts.ts` 조정: 아키타입이 뻔하지 않게, 어워드에 통계 숫자 활용, 줄거리 막 나누기 기준
- 구간 수가 많을 때(30개 이상) 종합 입력이 너무 커지면 노트를 2단계로 요약
- 비용 표시: 결과 하단 토큰 수를 예상 비용(모델 단가 환경변수)으로 환산

## T11. 퀴즈: 이름 먼저 입력, 누가 몇 점 받았는지 — 코드 완료 (DB 적용은 선택)

- 퀴즈 첫 화면에서 이름을 먼저 받는다. 방 멤버 이름 칩 중 고르거나 직접 입력(1~20자). 기본값은 지난번 퀴즈 이름 → "나는 누구?"에서 고른 이름
- 다 풀면 공유 링크에서는 자동 저장하고 "누가 몇 점 받았나" 목록을 보여준다. 표시는 항상 "80점"처럼 점수(맞힌 개수 ÷ 문제 수 × 100)로 통일. 같은 이름은 최고 기록 하나만, 동점이면 먼저 푼 사람이 위. 내 줄 강조
- 미리 풀기(`/r/[id]/quiz`)는 저장하지 않고 내 결과만
- 구현: `src/components/quiz/QuizRunner.tsx`, `src/lib/quiz/ranking.ts`(+테스트), `src/app/api/share/[id]/quiz/route.ts`(점수는 서버가 맞힌 개수로 계산, 닉네임 정리)

**DB 작업 (선택, 다른 에이전트가 적용)** — 화면은 점수만 쓰므로 안 해도 된다. 맞힌 개수를 기록으로 남기고 싶을 때만.

1. Supabase 대시보드 > SQL Editor에서 `supabase/migrations/0003_quiz_counts.sql` 전체를 붙여넣고 Run (여러 번 실행해도 안전)
2. Table Editor에서 `quiz_scores`에 `correct`, `total` 컬럼이 생겼는지 확인
3. 배포된 공유 링크에서 퀴즈를 끝까지 풀고, 새로 들어간 행에 `correct`/`total` 값이 채워졌는지 확인 (기존 행은 그대로 둔다)

적용 전에도 앱은 깨지지 않는다. API가 컬럼이 없다는 에러(42703, PGRST204)를 받으면 개수 없이 저장하고, 목록은 원래 점수로만 보여주므로 차이가 없다. 이미 저장된 기록은 수정하지 않는다.

## T12. 멤버 카드 유머 포인트, 근거 5개, 앞뒤 대화 보기, 어워드 인용 — 코드 완료

- 멤버 카드: 고정 칸(변화·유머·스트레스·챙김) 대신 한줄평, 말버릇(코드로 센 실제 문장·횟수, 누르면 쓴 장면), 명장면 1~2개, 사람마다 제목이 다른 꼭지 2~3개. 꼭지·명장면은 근거 원문이 1개 이상 남아야 보인다
- 연애·썸·플러팅 꼭지는 만들지 않는다 (절대 규칙 5)
- 근거 인용 5개(본인 말만). 인용 오른쪽 아이콘을 누르면 앞뒤 2줄씩 펼친다
- 어워드마다 수상자 본인 원문 1~2개, 스토리 어워드 장에도 한 줄
- 문맥은 분석이 끝날 때 워커에서 결과 인용 주변만 뽑아 결과와 함께 저장. 공유하면 문맥도 함께 올라간다 (`DataNotice` 안내 반영)
- 구현: `src/lib/llm/schema.ts`·`prompts.ts`·`verify.ts`(verifyReport)·`mock.ts`, `src/lib/report/context.ts`·`normalize.ts`, `src/components/report/Quotes.tsx`, `ReportView.tsx`
- 남은 일: 실제 키로 돌려 보고 꼭지 제목이 사람마다 겹치지 않는지, 명장면이 구체적인지 보고 프롬프트 조정 (T10과 같이). 출력이 길어져 비용이 30~50% 늘 수 있다

## 보류 중인 기능

### 이미지 만들기 프롬프트 (T8) — 화면에서 숨김

리포트 하단 "이미지 만들기 프롬프트" 섹션을 잠시 숨겼다. 코드는 지우지 않았다.

- 숨긴 곳: `src/components/report/ReportView.tsx`의 `ImagePrompts` import와 `<Section title="이미지 만들기 프롬프트">` 블록 (둘 다 `[보류]` 주석)
- 그대로 남아 있는 것: `src/components/prompts/ImagePrompts.tsx`, `src/lib/imagePrompt/build.ts`(+`prompt.test.ts`)
- AI 요청 쪽: 이 기능은 LLM에 따로 요청하지 않는다. 종합 리포트의 `members[].archetype/humor/care/bag`을 코드 템플릿에 채워 만들기 때문에 `src/lib/llm/prompts.ts`·`schema.ts`에는 숨길 부분이 없다. 나중에 LLM이 직접 프롬프트를 쓰게 바꾸려면 `reportSchema`에 `imagePrompts` 필드를 추가하고 `synthPrompt`에 지시를 넣는다(출력 토큰이 늘어 비용 증가).
- 다시 켜기: 위 두 `[보류]` 주석을 풀고 `npm run build`
