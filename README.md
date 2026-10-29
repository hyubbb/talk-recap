# Talk Recap

> 에이전트로 작업한다면 [`AGENTS.md`](AGENTS.md)부터 읽기. 문서: [PRD](docs/PRD.md) · [남은 작업](docs/TASKS.md) · [설정](docs/SETUP.md) · [구조](docs/ARCHITECTURE.md)

카카오톡 단톡방 내보내기 파일을 올리면 멤버 분석, 관계·궁합, MBTI 추론, What's in my bag까지 보여주는 웹 서비스.

## 지금 되는 것

- 카카오톡 내보내기 파서: 모바일(점·한글 날짜), PC 대괄호, 영문, CSV 형식. 분할 파일 자동 병합
- 멤버 정리: 닉네임 변경 묶기, 봇 제외, 별명 입력
- 통계: 수다 랭킹, 말버릇, 시간대, 답장·언급 행렬, 숨은 기록
- LLM용 구간 분할(날짜 경계 우선)과 민감정보 마스킹
- 업로드 미리보기 화면 (`/new`) — 파싱은 전부 브라우저 Web Worker에서 하고 서버로 보내지 않음
- 분석 기간 선택, OpenAI 구간 병렬 분석 → 종합, 결과 페이지 (`/r/[id]`, 브라우저 저장)

## AI 분석 켜기

```bash
cp .env.example .env.local   # OPENAI_API_KEY 채우기
npm run dev
```

- 키가 없으면 자동으로 목업 모드가 돼서 가짜 결과로 화면 흐름만 확인할 수 있다.
- `OPENAI_CHUNK_MODEL`(구간 분석, 여러 번 호출)은 저렴한 모델, `OPENAI_SYNTH_MODEL`(종합, 1번)은 좋은 모델을 권장.
- 구간 분석은 동시 3개, 실패하면 최대 3번까지 다시 시도한다. 원문에 없는 인용은 자동으로 버린다.
- 결과는 지금은 분석한 브라우저(localStorage)에만 저장된다. 공유 링크는 Supabase 연결 후.

## 개발

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # vitest
node scripts/make-sample.mjs > fixtures/sample-kakao.txt  # 가짜 샘플 대화 생성
```

## 개인정보 원칙

- 실제 대화 파일은 레포에 올리지 않는다 (`.gitignore`로 차단, 테스트는 지어낸 샘플만 사용)
- 원문은 브라우저 밖으로 나가지 않는다. AI 분석 단계에서도 구간 텍스트를 메모리로만 전달하고 저장하지 않는다

## 스택

Next.js 16 (App Router) · Tailwind CSS 4 · Jotai · TanStack Query · JSZip · Zod · Vitest · OpenAI API · Supabase(공유, 진행 중) · Vercel
