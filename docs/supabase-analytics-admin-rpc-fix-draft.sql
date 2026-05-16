-- WCL Supabase Analytics Admin RPC Follow-Up
-- Date: 2026-05-16
--
-- Status:
--   Draft for owner review.
--
-- Why this exists:
--   After analytics_events was made append-only for browser roles, some
--   analytics dashboard RPCs started returning:
--     permission denied for table analytics_events
--
--   The correct fix is not to grant direct SELECT on analytics_events.
--   These dashboard reads should go through admin-checked SECURITY DEFINER RPCs.
--
-- What this does:
--   - Keeps analytics_events insert-only for browser roles.
--   - Renames the current security-invoker analytics RPCs to *_raw.
--   - Recreates the original RPC names as admin-checked SECURITY DEFINER wrappers.
--   - Grants execute on the wrappers to authenticated users only.
--   - Blocks non-admin authenticated users inside the wrapper via bo_is_admin_v1().
--
-- What this does not do:
--   - It does not delete analytics data.
--   - It does not grant direct SELECT on analytics_events.
--   - It does not change public rendering, stores, moderation, or approval state.

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
    raise exception 'bo_is_admin_v1 must exist and be SECURITY DEFINER before updating analytics RPCs';
  end if;
end
$$;

do $$
begin
  if to_regprocedure('public.analytics_store_intelligence_v1_raw(integer, integer)') is null
     and to_regprocedure('public.analytics_store_intelligence_v1(integer, integer)') is not null then
    alter function public.analytics_store_intelligence_v1(integer, integer)
      rename to analytics_store_intelligence_v1_raw;
  end if;

  if to_regprocedure('public.analytics_market_countries_v1_raw(integer)') is null
     and to_regprocedure('public.analytics_market_countries_v1(integer)') is not null then
    alter function public.analytics_market_countries_v1(integer)
      rename to analytics_market_countries_v1_raw;
  end if;

  if to_regprocedure('public.analytics_market_cities_v1_raw(text, integer)') is null
     and to_regprocedure('public.analytics_market_cities_v1(text, integer)') is not null then
    alter function public.analytics_market_cities_v1(text, integer)
      rename to analytics_market_cities_v1_raw;
  end if;
end
$$;

create or replace function public.analytics_store_intelligence_v1(
  p_days integer default 30,
  p_limit integer default 50
)
returns table(
  store_id bigint,
  name text,
  views bigint,
  clicks bigint,
  ctr numeric,
  favorites bigint,
  avg_rating numeric,
  ratings_count bigint,
  comments_count bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(auth.uid()), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  return query
  select *
  from public.analytics_store_intelligence_v1_raw(p_days, p_limit);
end;
$function$;

create or replace function public.analytics_market_countries_v1(
  p_days integer default 30
)
returns table(
  country text,
  visitors bigint,
  clicks bigint,
  ctr numeric,
  momentum text,
  discovery text,
  top_city text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(auth.uid()), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  return query
  select *
  from public.analytics_market_countries_v1_raw(p_days);
end;
$function$;

create or replace function public.analytics_market_cities_v1(
  p_country text,
  p_days integer default 30
)
returns table(
  city text,
  visitors bigint,
  clicks bigint,
  ctr numeric,
  momentum text,
  discovery text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(auth.uid()), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  return query
  select *
  from public.analytics_market_cities_v1_raw(p_country, p_days);
end;
$function$;

revoke all privileges on function public.analytics_store_intelligence_v1_raw(integer, integer) from public, anon, authenticated;
revoke all privileges on function public.analytics_market_countries_v1_raw(integer) from public, anon, authenticated;
revoke all privileges on function public.analytics_market_cities_v1_raw(text, integer) from public, anon, authenticated;

revoke all privileges on function public.analytics_store_intelligence_v1(integer, integer) from public, anon;
revoke all privileges on function public.analytics_market_countries_v1(integer) from public, anon;
revoke all privileges on function public.analytics_market_cities_v1(text, integer) from public, anon;

grant execute on function public.analytics_store_intelligence_v1(integer, integer) to authenticated;
grant execute on function public.analytics_market_countries_v1(integer) to authenticated;
grant execute on function public.analytics_market_cities_v1(text, integer) to authenticated;

commit;

-- Verification queries:
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'analytics_store_intelligence_v1',
    'analytics_market_countries_v1',
    'analytics_market_cities_v1',
    'analytics_store_intelligence_v1_raw',
    'analytics_market_countries_v1_raw',
    'analytics_market_cities_v1_raw'
  )
order by p.proname;

select
  routine_name as function_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'analytics_store_intelligence_v1',
    'analytics_market_countries_v1',
    'analytics_market_cities_v1',
    'analytics_store_intelligence_v1_raw',
    'analytics_market_countries_v1_raw',
    'analytics_market_cities_v1_raw'
  )
  and grantee in ('anon', 'authenticated', 'PUBLIC', 'public')
order by routine_name, grantee, privilege_type;
