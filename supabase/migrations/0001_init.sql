-- 톡방 Wrapped 초기 스키마
-- Supabase 대시보드 > SQL Editor에 전체를 붙여넣고 Run.
-- 모든 테이블은 RLS를 켜고 공개 정책을 두지 않는다. 읽기/쓰기는 서버(Next.js API)가 secret key로만 한다.

-- 공유된 분석 결과
create table if not exists public.reports (
  id              text primary key,                       -- 추측 불가능한 공유 슬러그 (12자 이상)
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '30 days',
  title           text not null,
  member_count    int  not null,
  payload         jsonb not null,                         -- 리포트 + 통계 (대화 원문 전체는 저장하지 않음)
  owner_token_hash text not null,                         -- 삭제 권한 확인용 (sha256)
  view_count      int  not null default 0
);
create index if not exists reports_expires_at_idx on public.reports (expires_at);
alter table public.reports enable row level security;

-- "이 말 누가 했게?" 퀴즈 점수
create table if not exists public.quiz_scores (
  id          bigint generated always as identity primary key,
  report_id   text not null references public.reports(id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 1 and 20),
  member_name text,
  score       int  not null check (score between 0 and 100),
  created_at  timestamptz not null default now()
);
create index if not exists quiz_scores_report_idx on public.quiz_scores (report_id, score desc);
alter table public.quiz_scores enable row level security;

-- 반박권
create table if not exists public.objections (
  id          bigint generated always as identity primary key,
  report_id   text not null references public.reports(id) on delete cascade,
  target      text not null,                              -- 예: "member:홍길동", "mbti:홍길동", "award:2"
  member_name text not null,
  body        text not null check (char_length(body) between 1 and 200),
  status      text not null default 'open' check (status in ('open','accepted','rejected')),
  created_at  timestamptz not null default now(),
  unique (report_id, target, member_name)
);
alter table public.objections enable row level security;

-- 반박 인정/기각 투표
create table if not exists public.votes (
  id           bigint generated always as identity primary key,
  objection_id bigint not null references public.objections(id) on delete cascade,
  voter_key    text not null,                             -- 브라우저별 익명 키 (중복 투표 방지)
  value        smallint not null check (value in (-1, 1)),
  created_at   timestamptz not null default now(),
  unique (objection_id, voter_key)
);
alter table public.votes enable row level security;

-- 조회수 증가 (경쟁 조건 없이)
create or replace function public.increment_report_view(p_id text)
returns void language sql security definer set search_path = public as $$
  update public.reports set view_count = view_count + 1 where id = p_id and expires_at > now();
$$;
revoke all on function public.increment_report_view(text) from public, anon, authenticated;

-- 만료된 결과 매일 새벽 4시(UTC 19시)에 삭제. pg_cron이 없으면 이 블록은 건너뛰어도 된다.
create extension if not exists pg_cron;
select cron.schedule(
  'delete-expired-reports',
  '0 19 * * *',
  $$ delete from public.reports where expires_at < now() $$
);
