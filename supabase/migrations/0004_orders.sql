-- Talk Recap 결제 주문 (토스페이)
-- Supabase 대시보드 > SQL Editor에 붙여넣고 Run. 여러 번 실행해도 안전하다.
-- 회원가입이 없으므로 주문은 브라우저에 준 주문 비밀값(해시만 저장)으로 소유를 확인한다.
-- RLS를 켜고 공개 정책은 두지 않는다. 읽기·쓰기는 서버 API(secret key)만.

create table if not exists public.orders (
  id                text primary key,                          -- 상점 주문번호 (토스페이 orderNo)
  plan              text not null check (plan in ('lite', 'full')),
  amount            int  not null check (amount > 0),
  status            text not null default 'created'
                    check (status in ('created', 'paid', 'canceled', 'used', 'refunded')),
  pay_token         text,
  pay_method        text,
  mode              text,                                      -- TEST | LIVE (토스페이 상태 조회 결과)
  owner_token_hash  text not null,                             -- 주문 비밀값 sha256
  created_at        timestamptz not null default now(),
  paid_at           timestamptz,
  used_at           timestamptz,
  use_expires_at    timestamptz                                -- 결제일 + 30일 (이용권 사용 기한)
);
create index if not exists orders_status_idx on public.orders (status, created_at);
alter table public.orders enable row level security;
