-- WCL Public Traffic Analytics
-- Date: 2026-06-11
--
-- Purpose:
--   Adds privacy-safe, append-only traffic logging for the public WCL site and
--   one admin-only overview RPC for the Analytics dashboard.
--
-- Privacy model:
--   - No visitor ID
--   - No session ID
--   - No account ID
--   - No email address
--   - No IP-derived location
--   - No free-text search query
--
-- Safe to prepare before the frontend feature branch is merged. Existing live
-- frontend behavior is unchanged until the feature branch is deployed.

begin;

set local lock_timeout = '5s';

create or replace function public.log_public_activity_v1(
  p_event_type text,
  p_source text default 'direct',
  p_store_id bigint default null,
  p_store_country text default null,
  p_store_city text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_type text := lower(trim(coalesce(p_event_type, '')));
  v_source text :=
    case lower(trim(coalesce(p_source, 'direct')))
      when 'account' then 'account'
      when 'card' then 'card'
      when 'deep_link' then 'deep_link'
      when 'direct' then 'direct'
      when 'map' then 'map'
      when 'modal' then 'modal'
      when 'search' then 'search'
      when 'sidebar' then 'sidebar'
      else 'other'
    end;
begin
  if v_event_type not in (
    'site_opened',
    'store_view',
    'store_opened',
    'website_clicked',
    'directions_clicked',
    'search_used'
  ) then
    raise exception 'Unsupported public activity event: %', v_event_type
      using errcode = '22023';
  end if;

  insert into public.analytics_events (
    event_type,
    source,
    store_id,
    store_country,
    store_city,
    payload
  )
  values (
    v_event_type,
    v_source,
    p_store_id,
    left(nullif(trim(p_store_country), ''), 120),
    left(nullif(trim(p_store_city), ''), 120),
    jsonb_build_object(
      'analytics_mode', 'basic_aggregate',
      'logged_by', 'log_public_activity_v1'
    )
  );
end;
$function$;

revoke all privileges on function public.log_public_activity_v1(
  text,
  text,
  bigint,
  text,
  text
) from public;

grant execute on function public.log_public_activity_v1(
  text,
  text,
  bigint,
  text,
  text
) to anon, authenticated;

create or replace function public.analytics_traffic_overview_v1(
  p_days integer default 7
)
returns table(
  page_loads bigint,
  store_impressions bigint,
  store_opens bigint,
  website_clicks bigint,
  directions_clicks bigint,
  searches bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_days integer := greatest(coalesce(p_days, 7), 1);
  v_period_start timestamptz :=
    case
      when greatest(coalesce(p_days, 7), 1) = 1
        then date_trunc('day', now() at time zone 'Europe/Stockholm')
          at time zone 'Europe/Stockholm'
      else now() - make_interval(days => greatest(coalesce(p_days, 7), 1))
    end;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(auth.uid()), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  return query
  select
    count(*) filter (where e.event_type = 'site_opened')::bigint,
    count(*) filter (where e.event_type = 'store_view')::bigint,
    count(*) filter (where e.event_type = 'store_opened')::bigint,
    count(*) filter (where e.event_type = 'website_clicked')::bigint,
    count(*) filter (where e.event_type = 'directions_clicked')::bigint,
    count(*) filter (where e.event_type = 'search_used')::bigint
  from public.analytics_events e
  where e.timestamp >= v_period_start;
end;
$function$;

revoke all privileges on function public.analytics_traffic_overview_v1(integer)
from public, anon;

grant execute on function public.analytics_traffic_overview_v1(integer)
to authenticated;

notify pgrst, 'reload schema';

commit;

-- Verification:
-- Open the Analytics page as an authenticated WCL admin to verify overview
-- values. A direct SQL Editor call has no auth.uid() and is intentionally
-- rejected by the admin-only overview RPC.
select
  routine_name as function_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'log_public_activity_v1',
    'analytics_traffic_overview_v1'
  )
order by routine_name, grantee, privilege_type;
