# 톡방 Wrapped

카카오톡 단톡방 내보내기 파일을 올리면 멤버 분석, 관계·궁합, MBTI 추론, What's in my bag까지 보여주는 웹 서비스.

## 지금 되는 것 (1단계 프로토타입)

- 카카오톡 내보내기 파서: 모바일(점·한글 날짜), PC 대괄호, 영문, CSV 형식. 분할 파일 자동 병합
- 멤버 정리: 닉네임 변경 묶기, 봇 제외, 별명 입력
- 통계: 수다 랭킹, 말버릇, 시간대, 답장·언급 행렬, 숨은 기록
- LLM용 구간 분할(날짜 경계 우선)과 민감정보 마스킹
- 업로드 미리보기 화면 (`/new`) — 파싱은 전부 브라우저 Web Worker에서 하고 서버로 보내지 않음

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

Next.js (App Router) · Tailwind CSS · Jotai · TanStack Query · JSZip · Vitest · (예정) Supabase, Gemini API
