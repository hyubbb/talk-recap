<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Talk Recap — 에이전트 작업 규칙

카카오톡 단톡방 내보내기 파일을 올리면 멤버 분석, 관계·궁합, MBTI 추론, What's in my bag을 보여주는 서비스.
작업 전에 아래 문서를 먼저 읽는다.

- `docs/PRD.md` — 제품 요구사항 (무엇을, 왜)
- `docs/TASKS.md` — 남은 작업 목록과 완료 기준 (여기서 하나씩 가져가서 작업)
- `docs/SETUP.md` — Supabase·Vercel·OpenAI 설정과 환경변수
- `docs/ARCHITECTURE.md` — 코드 구조와 데이터 흐름

## 절대 규칙 (공개 레포)

1. **실제 카카오톡 대화 파일, 실제 사람 이름, API 키를 커밋하지 않는다.** 테스트·예시·주석에는 지어낸 이름(도토리, 고등어, 홍길동 등)만 쓴다. `fixtures/`에는 `scripts/make-sample.mjs`로 만든 가짜 대화만 둔다.
2. 커밋 전에 `git diff --cached`에서 `sk-`, `sb_secret`, `service_role`, 실제 대화 문장이 없는지 확인한다.
3. **대화 원문은 서버에 저장하지 않는다.** 파싱은 브라우저 Web Worker에서 하고, AI 분석 API는 구간 텍스트를 요청 메모리에서만 쓴다. 원문을 `console.log`, DB, 파일에 남기지 않는다.
4. LLM 출력의 인용(quote)은 반드시 원문과 대조해서 없는 건 버린다 (`src/lib/llm/verify.ts`).
5. 건강·정신건강, 자해·자살(농담 포함), 종교, 성적 지향, 연애 사생활, 범죄, 돈 문제는 분석·어워드·퀴즈에 쓰지 않는다 (`src/lib/llm/prompts.ts`의 RULES).

## 명령어

```bash
npm run dev      # 개발 서버
npm test         # vitest (커밋 전 필수)
npm run lint
npm run build    # 커밋 전 필수. cacheComponents 켜져 있음: 동적 params는 Suspense 안에서 읽기
node scripts/make-sample.mjs > fixtures/sample-kakao.txt   # 가짜 샘플 대화
```

키가 없으면 `LLM_PROVIDER`와 상관없이 mock 모드로 돌아간다. UI 작업은 mock으로 확인하면 된다.

## 컨벤션

- UI 문구는 한국어, 해요체, 짧게. 버튼은 동작을 그대로 쓴다("AI 분석 시작", "링크 복사").
- 디자인 토큰은 `src/app/globals.css`의 `@theme` (night/dusk/moon/haze/spark). 멤버 색은 `src/lib/ui/colors.ts`. 새 색 하드코딩 금지.
- 폰트: 본문 Pretendard, 포인트(어워드·인마이백·랭킹 번호)에만 Galmuri(`font-pixel`).
- 모바일 우선, 본문 폭 `max-w-[560px]`.
- 상태: 클라이언트 상태는 Jotai(`src/state/`), 서버 요청은 TanStack Query.
- 시간: 메시지 `ts`는 "대화에 찍힌 벽시계 시각을 UTC 필드에 담은 값". `getUTCHours()` 등으로 읽고 시간대 변환하지 않는다.
- 큰 배열에 `push(...arr)`, `Math.max(...arr)` 금지 (수십만 개에서 콜스택 초과). 반복문 사용.
- 커밋 메시지는 한국어로 무엇을 왜 바꿨는지.
