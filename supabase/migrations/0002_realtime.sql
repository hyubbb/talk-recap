-- 톡방 Wrapped: 반박권 투표 + 실시간 반영
-- Supabase 대시보드 > SQL Editor에 전체를 붙여넣고 Run. (0001_init.sql 다음)
--
-- 실시간은 Realtime Broadcast를 쓴다. 서버 API가 쓰기를 끝내면 report:{id} 채널에 "바뀌었음" 신호만 보내고,
-- 브라우저(publishable 키)는 신호를 받으면 서버 API로 다시 읽는다.
-- 그래서 테이블에는 여전히 공개 읽기·쓰기 정책이 없다. 대화 내용이 채널로 흘러가지 않는다.

create index if not exists objections_report_idx on public.objections (report_id);

-- 투표를 원자적으로 반영하고 과반 여부로 상태를 갱신한다. DB 왕복 한 번으로 끝내려고 검증도 같이 한다.
-- 과반 = 반박한 사람을 뺀 멤버 수의 절반 + 1 (src/lib/objection/rules.ts voteThreshold와 같은 식)
-- 공유가 없거나 만료됐거나 다른 방의 반박이면 빈 결과를 돌려준다.
drop function if exists public.cast_objection_vote(bigint, text, smallint, int);
create or replace function public.cast_objection_vote(
  p_report text,
  p_objection bigint,
  p_voter text,
  p_value smallint
) returns table (accept_count int, reject_count int, new_status text)
language plpgsql security definer set search_path = public as $$
declare
  mc int;
  t int;
  a int;
  r int;
  s text;
begin
  select rp.member_count into mc
    from public.reports rp
    join public.objections o on o.report_id = rp.id
   where rp.id = p_report and o.id = p_objection and rp.expires_at > now();
  if mc is null then
    return;
  end if;
  t := greatest(1, mc - 1) / 2 + 1;

  insert into public.votes (objection_id, voter_key, value)
  values (p_objection, p_voter, p_value)
  on conflict (objection_id, voter_key) do update set value = excluded.value, created_at = now();

  select count(*) filter (where value = 1), count(*) filter (where value = -1)
    into a, r
    from public.votes where objection_id = p_objection;

  s := case when a >= t then 'accepted' when r >= t then 'rejected' else 'open' end;
  update public.objections set status = s where id = p_objection;
  return query select a, r, s;
end;
$$;
revoke all on function public.cast_objection_vote(text, bigint, text, smallint) from public, anon, authenticated;

-- (선택) 비공개 채널로 바꿀 때를 위한 Realtime Authorization 정책: anon은 report:* 브로드캐스트 수신만
drop policy if exists "anon receives report broadcasts" on realtime.messages;
create policy "anon receives report broadcasts"
  on realtime.messages for select to anon
  using (realtime.messages.extension = 'broadcast' and realtime.topic() like 'report:%');
