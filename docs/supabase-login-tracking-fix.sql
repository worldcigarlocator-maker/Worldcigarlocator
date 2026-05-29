-- WCL Supabase Login Tracking Fix
-- Date: 2026-05-29
--
-- Purpose:
--   Makes member login analytics reliable by logging successful sign-ins through
--   an authenticated server-side RPC instead of relying only on browser
--   analytics consent or auth.users.last_sign_in_at.
--
-- Safe scope:
--   - Adds/replaces public.log_user_login_v1(text).
--   - Updates public.analytics_members_overview_v1(integer) to count unique
--     users from login events as a fallback/backup to auth.users.last_sign_in_at.
--   - Does not grant direct SELECT on analytics_events.
--   - Does not expose private auth data to public users.

begin;

set local lock_timeout = '5s';

create or replace function public.log_user_login_v1(
  p_source text default 'login'
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_source text := coalesce(nullif(trim(p_source), ''), 'login');
begin
  if v_uid is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  insert into public.analytics_events (
    event_type,
    source,
    payload
  )
  values (
    'user_login',
    v_source,
    jsonb_build_object(
      'user_id', v_uid::text,
      'source', v_source,
      'logged_by', 'log_user_login_v1'
    )
  );
end;
$function$;

revoke all privileges on function public.log_user_login_v1(text)
from public, anon;

grant execute on function public.log_user_login_v1(text)
to authenticated;

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
  with auth_counts as (
    select
      count(*)::bigint as total_members,
      count(*) filter (
        where u.created_at >= v_today_start
          and u.created_at < v_today_end
      )::bigint as new_members_today,
      count(*) filter (
        where u.last_sign_in_at >= v_today_start
          and u.last_sign_in_at < v_today_end
      )::bigint as auth_members_logged_in_today
    from auth.users u
  ),
  event_counts as (
    select
      count(*) filter (
        where e.timestamp >= v_today_start
          and e.timestamp < v_today_end
      )::bigint as login_events_today,
      count(*) filter (
        where e.timestamp >= v_period_start
      )::bigint as login_events_period,
      count(distinct nullif(e.payload->>'user_id', '')) filter (
        where e.timestamp >= v_today_start
          and e.timestamp < v_today_end
          and nullif(e.payload->>'user_id', '') is not null
      )::bigint as event_members_logged_in_today
    from public.analytics_events e
    where e.event_type = 'user_login'
  )
  select
    a.total_members,
    a.new_members_today,
    greatest(
      coalesce(a.auth_members_logged_in_today, 0),
      coalesce(e.event_members_logged_in_today, 0)
    )::bigint as members_logged_in_today,
    coalesce(e.login_events_today, 0)::bigint as login_events_today,
    coalesce(e.login_events_period, 0)::bigint as login_events_period
  from auth_counts a
  cross join event_counts e;
end;
$function$;

revoke all privileges on function public.analytics_members_overview_v1(integer)
from public, anon;

grant execute on function public.analytics_members_overview_v1(integer)
to authenticated;

commit;

-- Verification 1: execute grants.
select
  routine_name as function_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'log_user_login_v1',
    'analytics_members_overview_v1'
  )
  and grantee in ('anon', 'authenticated', 'PUBLIC', 'public')
order by routine_name, grantee;

-- Verification 2:
-- Run this while signed in as an authenticated user from the app, not from the
-- SQL editor, because SQL editor has no auth.uid().
-- select public.log_user_login_v1('manual_test');
