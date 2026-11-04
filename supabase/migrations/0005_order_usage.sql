-- Talk Recap 결제 한 건당 AI 분석량 한도
-- Supabase 대시보드 > SQL Editor에 붙여넣고 Run. 여러 번 실행해도 안전하다. (0004_orders.sql 다음에)
-- 서버(gate.ts)가 분석 요청마다 consume_order를 불러 원문 바이트·종합 횟수·대화 기간을 센다.
-- 한도는 서버 코드(src/lib/pay/usage.ts)가 정해서 넘기고, 여기서는 동시에 와도 정확히 세기만 한다.

alter table public.orders add column if not exists chunk_bytes bigint not null default 0;  -- 구간 분석에 보낸 원문 바이트 합 (재시도 포함)
alter table public.orders add column if not exists synth_calls int    not null default 0;  -- 종합 호출 수
alter table public.orders add column if not exists span_from   bigint;                     -- 분석한 구간 중 가장 이른 날 (ms, 대화 벽시계 기준)
alter table public.orders add column if not exists span_to     bigint;                     -- 가장 늦은 날

-- 'ok' | 'missing' | 'bytes' | 'span' | 'synth'
create or replace function public.consume_order(
  p_id text, p_kind text, p_bytes bigint, p_from bigint, p_to bigint,
  p_max_bytes bigint, p_max_synth int, p_max_span bigint
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_id for update;
  if not found then
    return 'missing';
  end if;

  if p_kind = 'synth' then
    if o.synth_calls >= p_max_synth then
      return 'synth';
    end if;
    update public.orders set synth_calls = synth_calls + 1 where id = p_id;
    return 'ok';
  end if;

  if o.chunk_bytes + p_bytes > p_max_bytes then
    return 'bytes';
  end if;
  if greatest(coalesce(o.span_to, p_to), p_to) - least(coalesce(o.span_from, p_from), p_from) > p_max_span then
    return 'span';
  end if;
  update public.orders
     set chunk_bytes = chunk_bytes + p_bytes,
         span_from = least(coalesce(span_from, p_from), p_from),
         span_to = greatest(coalesce(span_to, p_to), p_to)
   where id = p_id;
  return 'ok';
end;
$$;

-- 서버(secret key)만 부른다
revoke all on function public.consume_order(text, text, bigint, bigint, bigint, bigint, int, bigint) from public, anon, authenticated;
grant execute on function public.consume_order(text, text, bigint, bigint, bigint, bigint, int, bigint) to service_role;
