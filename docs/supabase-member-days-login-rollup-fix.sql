-- WCL Supabase Member Login Rollup Fix
-- Date: 2026-05-31
--
-- Purpose:
--   The Members drilldown in Analytics uses analytics_member_days and related
--   RPCs. Those RPCs predate the reliable server-side login tracker and can
--   show 0 even when new members/sign-ins exist.
--
-- What this does:
--   - Rebuilds the member day/country/city/member/timeline RPCs on top of:
--       1. auth.users.last_sign_in_at
--       2. analytics_events where event_type = 'user_login'
--   - Uses Europe/Stockholm calendar dates for the admin dashboard.
--   - Keeps the public frontend and cookies out of member login counting.
--   - Keeps direct table access closed; these are SECURITY DEFINER admin RPCs.
--
-- What this does not do:
--   - It does not delete or mutate member rows.
--   - It does not expose auth.users directly.
--   - It does not backfill missing historical login events that were never
--     recorded, but it does read existing auth.users.last_sign_in_at.

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
    raise exception 'bo_is_admin_v1 must exist and be SECURITY DEFINER before running this fix';
  end if;
end
$$;

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
as $function$
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
$function$;

create or replace function public.analytics_member_countries(
  p_day date
)
returns table(
  country text,
  views bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_day date := coalesce(p_day, (now() at time zone 'Europe/Stockholm')::date);
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(auth.uid()), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  return query
  with event_logins as (
    select
      nullif(e.payload->>'user_id', '') as user_id,
      nullif(coalesce(e.user_country, e.payload->>'user_country'), '') as country
    from public.analytics_events e
    where e.event_type = 'user_login'
      and (e.timestamp at time zone 'Europe/Stockholm')::date = v_day
      and nullif(e.payload->>'user_id', '') is not null
  ),
  auth_logins as (
    select
      u.id::text as user_id,
      null::text as country
    from auth.users u
    where u.last_sign_in_at is not null
      and (u.last_sign_in_at at time zone 'Europe/Stockholm')::date = v_day
  ),
  per_user as (
    select
      x.user_id,
      coalesce(
        max(x.country) filter (where x.country is not null),
        'Unknown'
      ) as country
    from (
      select * from event_logins
      union all
      select * from auth_logins
    ) x
    group by x.user_id
  )
  select
    pu.country,
    count(*)::bigint as views
  from per_user pu
  group by pu.country
  order by views desc, country asc;
end;
$function$;

create or replace function public.analytics_member_cities(
  p_day date,
  p_country text
)
returns table(
  city text,
  views bigint,
  clicks bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_day date := coalesce(p_day, (now() at time zone 'Europe/Stockholm')::date);
  v_country text := nullif(trim(p_country), '');
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(auth.uid()), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  return query
  with event_logins as (
    select
      nullif(e.payload->>'user_id', '') as user_id,
      coalesce(
        nullif(e.user_country, ''),
        nullif(e.payload->>'user_country', ''),
        'Unknown'
      ) as country,
      coalesce(
        nullif(e.user_city, ''),
        nullif(e.payload->>'user_city', ''),
        'Unknown'
      ) as city
    from public.analytics_events e
    where e.event_type = 'user_login'
      and (e.timestamp at time zone 'Europe/Stockholm')::date = v_day
      and nullif(e.payload->>'user_id', '') is not null
  ),
  filtered as (
    select distinct
      el.user_id,
      el.city
    from event_logins el
    where v_country is null
      or lower(el.country) = lower(v_country)
  )
  select
    f.city,
    count(*)::bigint as views,
    0::bigint as clicks
  from filtered f
  group by f.city
  order by views desc, city asc;
end;
$function$;

create or replace function public.analytics_members_by_city(
  p_day text,
  p_country text,
  p_city text
)
returns table(
  user_id text,
  display_name text,
  email text,
  total_logins bigint,
  language text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_day date := coalesce(nullif(trim(p_day), '')::date, (now() at time zone 'Europe/Stockholm')::date);
  v_country text := nullif(trim(p_country), '');
  v_city text := nullif(trim(p_city), '');
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(auth.uid()), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  return query
  with matching_events as (
    select
      nullif(e.payload->>'user_id', '') as user_id
    from public.analytics_events e
    where e.event_type = 'user_login'
      and (e.timestamp at time zone 'Europe/Stockholm')::date = v_day
      and nullif(e.payload->>'user_id', '') is not null
      and (
        v_country is null
        or lower(coalesce(e.user_country, e.payload->>'user_country', 'Unknown')) = lower(v_country)
      )
      and (
        v_city is null
        or lower(coalesce(e.user_city, e.payload->>'user_city', 'Unknown')) = lower(v_city)
      )
  ),
  matching_auth as (
    select
      u.id::text as user_id
    from auth.users u
    where u.last_sign_in_at is not null
      and (u.last_sign_in_at at time zone 'Europe/Stockholm')::date = v_day
      and coalesce(v_country, 'Unknown') = 'Unknown'
      and coalesce(v_city, 'Unknown') = 'Unknown'
  ),
  users_for_day as (
    select distinct user_id from matching_events
    union
    select distinct user_id from matching_auth
  ),
  login_totals as (
    select
      nullif(e.payload->>'user_id', '') as user_id,
      count(*)::bigint as total_logins
    from public.analytics_events e
    where e.event_type = 'user_login'
      and nullif(e.payload->>'user_id', '') is not null
    group by nullif(e.payload->>'user_id', '')
  )
  select
    u.id::text as user_id,
    coalesce(
      nullif(u.raw_user_meta_data->>'display_name', ''),
      nullif(u.raw_user_meta_data->>'name', ''),
      split_part(u.email, '@', 1)
    ) as display_name,
    u.email::text as email,
    greatest(
      coalesce(lt.total_logins, 0),
      case when u.last_sign_in_at is null then 0 else 1 end
    )::bigint as total_logins,
    coalesce(
      nullif(u.raw_user_meta_data->>'language', ''),
      nullif(u.raw_user_meta_data->>'locale', ''),
      '-'
    ) as language
  from users_for_day ufd
  join auth.users u on u.id::text = ufd.user_id
  left join login_totals lt on lt.user_id = u.id::text
  order by total_logins desc, display_name asc;
end;
$function$;

create or replace function public.analytics_member_timeline(
  p_user_id text
)
returns table(
  event_time text,
  event_type text,
  source text,
  store_country text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id text := nullif(trim(p_user_id), '');
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(auth.uid()), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  if v_user_id is null then
    return;
  end if;

  return query
  select
    to_char(e.timestamp at time zone 'Europe/Stockholm', 'YYYY-MM-DD HH24:MI') as event_time,
    e.event_type,
    coalesce(e.source, e.payload->>'source', '-') as source,
    coalesce(e.store_country, e.payload->>'store_country', '-') as store_country
  from public.analytics_events e
  where nullif(e.payload->>'user_id', '') = v_user_id
  order by e.timestamp desc
  limit 100;
end;
$function$;

revoke all privileges on function public.analytics_member_days(integer)
from public, anon;
revoke all privileges on function public.analytics_member_countries(date)
from public, anon;
revoke all privileges on function public.analytics_member_cities(date, text)
from public, anon;
revoke all privileges on function public.analytics_members_by_city(text, text, text)
from public, anon;
revoke all privileges on function public.analytics_member_timeline(text)
from public, anon;

grant execute on function public.analytics_member_days(integer)
to authenticated;
grant execute on function public.analytics_member_countries(date)
to authenticated;
grant execute on function public.analytics_member_cities(date, text)
to authenticated;
grant execute on function public.analytics_members_by_city(text, text, text)
to authenticated;
grant execute on function public.analytics_member_timeline(text)
to authenticated;

commit;

-- SQL editor verification, safe to run as project owner.
-- This does not call the admin RPCs, because SQL editor has no auth.uid().
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
