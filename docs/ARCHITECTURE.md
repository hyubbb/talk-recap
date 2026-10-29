# 아키텍처

## 데이터 흐름

```
[브라우저]                                   [서버: Next.js Route Handler]        [외부]
파일 드롭 (zip/txt/csv)
  └─ Web Worker (analyze.worker.ts)
       파싱 → 멤버 묶기 → 통계 → 구간 분할(+민감정보 마스킹)
       원문은 워커 메모리에만 보관
  └─ /new 화면: 기간 선택, 멤버 확인, 통계 미리보기
  └─ "AI 분석 시작"
       워커에서 구간 텍스트를 꺼내
       동시 3개씩 POST ─────────────────────→ /api/analyze/chunk ──────────→ OpenAI
                                              (Zod 검증, 인용 원문 대조)
       구간 노트 + 통계 요약 POST ─────────→ /api/analyze/synthesize ─────→ OpenAI
                                              (노트에 없던 인용 제거)
  └─ 결과를 localStorage에 저장 → /r/[id]
  └─ 공유: POST /api/share ────────────────→ Supabase reports 테이블 (Zod 검증, 500KB 상한)
       삭제 토큰은 localStorage에만,           DB엔 토큰 sha256 해시만
       DELETE /api/share/[id] (x-delete-token)
  └─ /s/[id] 에서 서버가 읽어 렌더, opengraph-image로 미리보기
  └─ Vercel Cron → /api/cron/ping (CRON_SECRET) → Supabase 핑
```

## 디렉터리

| 경로 | 내용 |
| --- | --- |
| `src/lib/kakao/` | 파서(`parse.ts`), 멤버 묶기(`members.ts`), 통계(`stats.ts`), 구간 분할(`chunk.ts`), 민감정보 마스킹(`privacy.ts`). 순수 함수, 테스트 있음 |
| `src/workers/` | Web Worker와 메시지 프로토콜(`protocol.ts`) |
| `src/lib/llm/` | 출력 스키마(`schema.ts`, Zod → OpenAI strict JSON Schema), 프롬프트, OpenAI 호출(`provider.ts`, server-only), mock, 인용 검증 |
| `src/lib/report/` | 종합 단계용 통계 요약(`digest.ts`), 결과 저장(`storage.ts`, 지금은 localStorage) |
| `src/app/api/analyze/` | 구간 분석·종합 API |
| `src/app/new/` | 업로드·기간 선택·멤버 확인·분석 진행 화면 |
| `src/app/r/[id]/` | 결과 화면 (브라우저 저장본) + 공유 링크 만들기 |
| `src/app/s/[id]/` | 공유 결과 화면, 카톡 미리보기 이미지 |
| `src/app/api/share/` | 공유 생성·삭제 API |
| `src/lib/share/` | 슬러그·삭제 토큰(`token.ts`), 본문 스키마(`schema.ts`), 읽기(`repo.ts`, server-only) |
| `src/lib/supabase/` | 서버 전용 Supabase 클라이언트 |
| `src/components/` | `upload/`, `analysis/`, `report/` 화면 조각 |
| `src/state/` | Jotai atom (`upload.ts`, `analysis.ts`) |
| `src/hooks/` | 워커 연결(`useAnalyzeWorker`), 분석 실행(`useRunAnalysis`, TanStack mutation) |
| `supabase/migrations/` | DB 스키마 SQL |
| `fixtures/`, `scripts/` | 가짜 샘플 대화와 생성 스크립트 |

## 지원하는 내보내기 형식 (`src/lib/kakao/parse.ts`)

| 형식 | 예 |
| --- | --- |
| mobile-dot | `2026. 7. 19. 오후 5:03, 이름 : 내용` |
| mobile-korean | `2026년 7월 19일 오후 5:03, 이름 : 내용` |
| pc-bracket | `--------------- 2026년 7월 19일 일요일 ---------------` 다음 `[이름] [오후 5:03] 내용` |
| english | `Jul 19, 2026 at 5:03 PM, Name : text` |
| csv | `Date,User,Message` 헤더 + `2026-07-19 17:03:00,"이름","내용"` |

새 형식을 발견하면 `parse.test.ts`에 지어낸 샘플로 테스트를 먼저 추가한다.

## LLM 출력 스키마 (`src/lib/llm/schema.ts`)

- `ChunkNotes`: 구간 요약, 사건, 멤버별 관찰(에피소드·유머·스트레스·챙김·속마음·본인이 밝힌 MBTI·축별 단서·인용), 관계, 레전드 장면, 가방 단서
- `Report`: 제목, 한 줄 요약, 3~5막 줄거리, 멤버별(아키타입·요약·변화·인용·MBTI 축별 근거·가방), 궁합 쌍, 어워드, 총평
- 스키마를 바꾸면 `llm.test.ts`의 strict 검사도 같이 통과해야 한다.
