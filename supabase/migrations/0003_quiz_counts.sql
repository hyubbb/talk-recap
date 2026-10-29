-- 퀴즈 결과에 "몇 개 맞혔는지"를 저장한다.
-- Supabase 대시보드 > SQL Editor에 전체를 붙여넣고 Run. 여러 번 실행해도 안전하다.
-- 적용 전에도 앱은 동작한다(점수만 저장·표시). 적용 후부터 "10개 중 8개" 형태로 보인다.

alter table public.quiz_scores
  add column if not exists correct int,
  add column if not exists total   int;

alter table public.quiz_scores
  drop constraint if exists quiz_scores_counts_check;
alter table public.quiz_scores
  add constraint quiz_scores_counts_check
  check (
    (correct is null and total is null)
    or (total between 1 and 50 and correct between 0 and total)
  );

-- 같은 방에서 이름별 최고 기록을 빨리 찾기 위한 인덱스
create index if not exists quiz_scores_report_nick_idx
  on public.quiz_scores (report_id, nickname, score desc);
