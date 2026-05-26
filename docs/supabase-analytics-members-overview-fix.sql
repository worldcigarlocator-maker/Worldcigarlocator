-- WCL Supabase Analytics Members Overview Fix
-- Date: 2026-05-26
--
-- Status:
--   Draft for owner review. Run in Supabase SQL Editor before wiring the
--   Analytics UI to these values.
--
-- Why this exists:
--   The current Analytics "Members" card is fed by sessions, not real accounts.
--   Login drilldown is fed by analytics_events, which can undercount when browser
--   tracking or cookie state prevents/limits event detail.
--
-- What this does:
--   - Adds one admin-only backend RPC for member/account truth.
--   - Counts total accounts from Supabase Auth.
--   - Counts accounts created today from Supabase Auth.
--   - Counts unique members whose Supabase Auth last_sign_in_at is today.
--   - Also exposes analytics event login counts for comparison/debugging.
--
-- What this does not do:
--   - It does not delete or update users.
--   - It does not grant direct browser access to auth.users.
--   - It does not change public rendering, moderation, listings, or analytics events.

begin;

set local lock_timeout = '5s';

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'bo_is_admin_v1'
      and p.prosecdef = true
  ) then
    raise exception 'bo_is_admin_v1 must exist and be SECURITY DEFINER before creating analytics_members_overview_v1';
  end if;
end
$$;

create or replace function public.analytics_members_overview_v1(
  p_days integer default 30
)
returns table(
  total_members bigint,
  new_members_today bigint,
  members_logged_in_today bigint,
  login_events_today bigint,
  login_events_period bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_today_start timestamptz := date_trunc('day', now());
  v_today_end timestamptz := date_trunc('day', now()) + interval '1 day';
  v_period_start timestamptz :=
    now() - (greatest(coalesce(p_days, 30), 1)::text || ' days')::interval;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(auth.uid()), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  return query
  select
    (
      select count(*)::bigint
      from auth.users u
    ) as total_members,
    (
      select count(*)::bigint
      from auth.users u
      where u.created_at >= v_today_start
        and u.created_at < v_today_end
    ) as new_members_today,
    (
      select count(*)::bigint
      from auth.users u
      where u.last_sign_in_at >= v_today_start
        and u.last_sign_in_at < v_today_end
    ) as members_logged_in_today,
    (
      select count(*)::bigint
      from public.analytics_events e
      where e.event_type = 'user_login'
        and e.timestamp >= v_today_start
        and e.timestamp < v_today_end
    ) as login_events_today,
    (
      select count(*)::bigint
      from public.analytics_events e
      where e.event_type = 'user_login'
        and e.timestamp >= v_period_start
    ) as login_events_period;
end;
$function$;

revoke all privileges on function public.analytics_members_overview_v1(integer)
from public, anon;

grant execute on function public.analytics_members_overview_v1(integer)
to authenticated;

commit;

-- Verification query:
select *
from public.analytics_members_overview_v1(30);

-- Function grant verification:
select
  routine_name as function_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'analytics_members_overview_v1'
  and grantee in ('anon', 'authenticated', 'PUBLIC', 'public')
order by routine_name, grantee, privilege_type;
