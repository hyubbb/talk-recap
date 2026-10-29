# 설정 가이드 (Supabase · Vercel · OpenAI)

## 환경변수

| 이름 | 어디서 | 필수 | 설명 |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | platform.openai.com > API keys | AI 분석 시 | 없으면 mock 모드 |
| `LLM_PROVIDER` | 직접 | 아니오 | `openai`(기본) 또는 `mock` |
| `OPENAI_CHUNK_MODEL` | 직접 | 아니오 | 구간 분석(여러 번 호출). 저렴한 모델. 기본 `gpt-4.1-mini` |
| `OPENAI_SYNTH_MODEL` | 직접 | 아니오 | 종합(1번 호출). 좋은 모델. 기본 `gpt-4.1` |
| `SUPABASE_URL` | Supabase > Project Settings > API | 공유 기능 | `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase > Project Settings > API Keys | 공유 기능 | `sb_secret_...` 또는 예전 `service_role` 키. **서버 전용, `NEXT_PUBLIC_` 붙이지 않기** |

로컬: `cp .env.example .env.local` 후 값 채우기. `.env*`는 `.gitignore`로 막혀 있다(`.env.example`만 예외).
키는 채팅·이슈·커밋에 붙여넣지 않는다. 노출됐으면 바로 폐기하고 새로 발급한다.

## DB 스키마

`supabase/migrations/0001_init.sql` — Supabase 대시보드 SQL Editor에 전체 붙여넣고 Run.

| 테이블 | 용도 |
| --- | --- |
| `reports` | 공유된 분석 결과 (슬러그 id, 만료일 기본 30일, payload jsonb, 삭제용 토큰 해시, 조회수) |
| `quiz_scores` | "이 말 누가 했게?" 퀴즈 점수 |
| `objections` | 반박권 (항목당 멤버 1회) |
| `votes` | 반박 인정/기각 투표 (브라우저별 익명 키로 중복 방지) |

모든 테이블은 RLS를 켜고 공개 정책이 없다. 접근은 서버 API가 secret key로만 한다.
만료된 `reports`는 pg_cron으로 매일 삭제된다(pg_cron이 없으면 해당 두 줄은 빼도 됨).

## 브라우저 에이전트용 설정 프롬프트

Claude in Chrome 같은 브라우저 에이전트에 아래를 그대로 붙여넣으면 Supabase와 Vercel 설정을 화면을 보면서 진행한다.

```
나는 Next.js 프로젝트 "tokbang-wrapped"(GitHub: hyubbb/tokbang-wrapped, 공개 레포)를
Supabase와 Vercel에 연결하려고 해. 브라우저 화면을 보면서 아래 순서대로 진행해 줘.
각 단계가 끝나면 짧게 보고하고, 결제·요금제 업그레이드·기존 프로젝트 삭제가 필요한 화면이 나오면 멈추고 나한테 물어봐.
API 키나 비밀번호는 대화창에 전체를 다시 출력하지 말고, 복사해서 붙여넣는 것만 해 줘.

[1] Supabase 프로젝트 만들기
- supabase.com 대시보드에서 New project를 만든다.
- 이름: tokbang-wrapped / 지역: Northeast Asia (Seoul) / 플랜: Free
- DB 비밀번호는 "Generate a password"로 만들고, 나중에 내가 직접 저장할 수 있게 화면에만 보여 둔다.
- 프로젝트 생성이 끝날 때까지 기다린다.

[2] 테이블 만들기
- 아래 주소의 SQL 전체를 연다:
  https://raw.githubusercontent.com/hyubbb/tokbang-wrapped/main/supabase/migrations/0001_init.sql
- Supabase 대시보드 > SQL Editor > New query에 그 SQL 전체를 붙여넣고 Run.
- 에러가 나면 메시지를 그대로 알려 줘. pg_cron 관련 에러만 나면 마지막 두 문장(create extension pg_cron, cron.schedule)을 지우고 다시 Run.
- Table Editor에서 reports, quiz_scores, objections, votes 4개가 생겼고 전부 RLS enabled인지 확인한다.

[3] Supabase 키 확인
- Project Settings > API (또는 API Keys)에서 두 값을 찾는다:
  - Project URL (https://xxxx.supabase.co 형태) → SUPABASE_URL
  - secret key (sb_secret_로 시작) 또는 예전 방식의 service_role 키 → SUPABASE_SECRET_KEY
- publishable/anon 키는 이번엔 쓰지 않는다.

[4] Vercel에 배포
- vercel.com에 GitHub 계정(hyubbb)으로 로그인하고 Add New > Project에서 hyubbb/tokbang-wrapped를 Import.
- Framework는 Next.js 자동 감지 그대로 둔다.
- Deploy 전에 Environment Variables에 아래를 추가한다 (Production, Preview, Development 모두 체크):
  - SUPABASE_URL = [3]의 Project URL
  - SUPABASE_SECRET_KEY = [3]의 secret key
  - OPENAI_API_KEY = (이 값은 내가 직접 붙여넣을게. 이 칸에 도착하면 멈추고 나를 불러 줘)
  - OPENAI_CHUNK_MODEL = gpt-4.1-mini
  - OPENAI_SYNTH_MODEL = gpt-4.1
  - LLM_PROVIDER = openai
- Deploy를 누르고 빌드가 끝날 때까지 기다린다. 실패하면 빌드 로그의 에러 부분을 알려 줘.

[5] Vercel 설정 확인
- Project Settings > Functions에서:
  - Function Region을 Seoul (icn1)로 바꿀 수 있으면 바꾼다.
  - Fluid Compute가 켜져 있는지 확인한다(꺼져 있으면 켠다). AI 분석 한 번에 1~3분 걸려서 함수 실행 시간이 길어야 한다.
  - Max Duration 설정이 보이면 현재 플랜에서 고를 수 있는 최댓값으로 둔다(300초 이상이면 충분). 유료 플랜이 필요하다고 나오면 멈추고 알려 줘.
- 설정을 바꿨으면 Deployments에서 최신 배포를 Redeploy한다.

[6] 동작 확인
- 배포된 주소(https://tokbang-wrapped-xxxx.vercel.app)를 열어 랜딩 페이지가 뜨는지 확인한다.
- /new 페이지가 열리는지 확인한다.
- 마지막으로 배포 주소, Supabase 프로젝트 이름과 지역, 각 단계 성공 여부를 정리해서 알려 줘.
```

## 주의

- Vercel Hobby 플랜은 개인·비상업용이다. 광고나 유료화를 붙이면 Pro로 바꿔야 한다.
- Supabase Free는 7일 동안 요청이 없으면 일시 중지된다. 공개 후에는 주기적으로 요청하는 크론을 둔다(TASKS의 T1 참고).
- OpenAI API는 기본적으로 입력을 학습에 쓰지 않는 정책이지만 오남용 감시용 보관이 있을 수 있다. 개인정보처리방침에 "해외 AI API 전송"을 적는다.
