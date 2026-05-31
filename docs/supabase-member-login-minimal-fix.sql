-- WCL Supabase Member Login Minimal Fix
-- Date: 2026-05-31
--
-- Run this first if Analytics > Members shows 0 logins even though new
-- members/sign-ins exist.
--
-- This smaller patch fixes:
--   - the top Members/Login KPI via analytics_members_overview_v1
--   - the Members date table via analytics_member_days
--
-- It counts from:
--   - auth.users.created_at
--   - auth.users.last_sign_in_at
--   - analytics_events where event_type = 'user_login'
--
-- Dates are shown in Europe/Stockholm.

begin;

set local lock_timeout = '5s';

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
as $wcl$
declare
  v_today date := (now() at time zone 'Europe/Stockholm')::date;
  v_period_start date :=
    (now() at time zone 'Europe/Stockholm')::date
      - (greatest(coalesce(p_days, 30), 1) - 1);
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
        where (u.created_at at time zone 'Europe/Stockholm')::date = v_today
      ) as new_members_today,
      count(distinct u.id) filter (
        where u.last_sign_in_at is not null
          and (u.last_sign_in_at at time zone 'Europe/Stockholm')::date = v_today
      ) as auth_members_logged_in_today
    from auth.users u
  ),
  event_counts as (
    select
      count(*) filter (
        where (e.timestamp at time zone 'Europe/Stockholm')::date = v_today
      ) as login_events_today,
      count(*) filter (
        where (e.timestamp at time zone 'Europe/Stockholm')::date >= v_period_start
      ) as login_events_period,
      count(distinct nullif(e.payload->>'user_id', '')) filter (
        where (e.timestamp at time zone 'Europe/Stockholm')::date = v_today
          and nullif(e.payload->>'user_id', '') is not null
      ) as event_members_logged_in_today
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
$wcl$;

create or replace function public.analytics_member_days(
  p_days integer
)
returns table(
  day text,
  views bigint
)
language plpgsql
security definer
set search_path to 'public'
as $wcl$
declare
  v_days integer := greatest(coalesce(p_days, 7), 1);
  v_today date := (now() at time zone 'Europe/Stockholm')::date;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(auth.uid()), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  return query
  with calendar as (
    select generate_series(
      v_today - (v_days - 1),
      v_today,
      interval '1 day'
    )::date as day_date
  ),
  login_rows as (
    select
      u.id::text as user_id,
      (u.last_sign_in_at at time zone 'Europe/Stockholm')::date as day_date
    from auth.users u
    where u.last_sign_in_at is not null
      and (u.last_sign_in_at at time zone 'Europe/Stockholm')::date
        between v_today - (v_days - 1) and v_today

    union all

    select
      nullif(e.payload->>'user_id', '') as user_id,
      (e.timestamp at time zone 'Europe/Stockholm')::date as day_date
    from public.analytics_events e
    where e.event_type = 'user_login'
      and nullif(e.payload->>'user_id', '') is not null
      and (e.timestamp at time zone 'Europe/Stockholm')::date
        between v_today - (v_days - 1) and v_today
  ),
  daily as (
    select
      lr.day_date,
      count(distinct lr.user_id)::bigint as logins
    from login_rows lr
    group by lr.day_date
  )
  select
    c.day_date::text as day,
    coalesce(d.logins, 0)::bigint as views
  from calendar c
  left join daily d on d.day_date = c.day_date
  order by c.day_date desc;
end;
$wcl$;

revoke all privileges on function public.analytics_members_overview_v1(integer)
from public, anon;

revoke all privileges on function public.analytics_member_days(integer)
from public, anon;

grant execute on function public.analytics_members_overview_v1(integer)
to authenticated;

grant execute on function public.analytics_member_days(integer)
to authenticated;

commit;

-- SQL editor verification. This is safe to run as project owner.
-- It does not call admin RPCs because SQL editor has no auth.uid().
select
  (now() at time zone 'Europe/Stockholm')::date as stockholm_today,
  (
    select count(*)::bigint
    from auth.users u
    where (u.created_at at time zone 'Europe/Stockholm')::date =
      (now() at time zone 'Europe/Stockholm')::date
  ) as new_members_today,
  (
    select count(distinct u.id)::bigint
    from auth.users u
    where u.last_sign_in_at is not null
      and (u.last_sign_in_at at time zone 'Europe/Stockholm')::date =
        (now() at time zone 'Europe/Stockholm')::date
  ) as auth_members_logged_in_today,
  (
    select count(distinct nullif(e.payload->>'user_id', ''))::bigint
    from public.analytics_events e
    where e.event_type = 'user_login'
      and nullif(e.payload->>'user_id', '') is not null
      and (e.timestamp at time zone 'Europe/Stockholm')::date =
        (now() at time zone 'Europe/Stockholm')::date
  ) as tracked_members_logged_in_today;
