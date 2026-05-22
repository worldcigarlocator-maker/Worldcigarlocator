-- WCL Supabase Security Fix Draft
-- Date: 2026-05-15
--
-- Status:
--   Draft for owner review. Do not run until approved.
--
-- What this does:
--   - Removes direct public/authenticated access from internal no-RLS tables.
--   - Adds server-side admin enforcement to approve_store_pending.
--   - Keeps analytics append-only by allowing INSERT only for known frontend events.
--   - Stops public reads of pending store submissions.
--   - Keeps pending store submission INSERT available for the public add-store flow.
--
-- What this does not do:
--   - It does not delete table data.
--   - It does not drop tables.
--   - It does not approve, reject, or mutate store rows.
--
-- Important:
--   Run this only after a Supabase backup/export exists.

begin;

set local lock_timeout = '5s';

-- Backoffice checks rely on this function being server-authoritative.
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

-- Admin table exposed in focused grant result.
revoke all privileges on table public.bo_admins from anon, authenticated;

-- Do not revoke public.wcl_admins in this draft yet.
-- Current stores insert policy references public.wcl_admins directly.
-- First replace that policy with a SECURITY DEFINER admin check, then lock wcl_admins.

-- Admin RPC hardening:
-- The previous approve_store_pending function was SECURITY DEFINER but did not
-- check auth.uid() or admin status before approving and deleting pending rows.
create or replace function public.approve_store_pending(p_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid;
  v_is_admin boolean;
  rec record;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  select public.bo_is_admin_v1(v_uid) into v_is_admin;

  if not coalesce(v_is_admin, false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  select *
  into rec
  from public.store_pending
  where id = p_id
  for update;

  if not found then
    return;
  end if;

  insert into public.stores (
    name, address, city, country, country_iso2,
    lat, lng, phone, website, types, access,
    place_id, photo_reference, created_at,
    approved, status
  )
  values (
    rec.name, rec.address, rec.city, rec.country, rec.country_iso2,
    rec.lat, rec.lng, rec.phone, rec.website, rec.types, rec.access,
    rec.place_id, rec.photo_reference, now(),
    true, 'approved'
  );

  delete from public.store_pending
  where id = rec.id;
end;
$function$;

revoke all privileges on function public.approve_store_pending(bigint) from public, anon;
grant execute on function public.approve_store_pending(bigint) to authenticated;

revoke all privileges on function public.bo_moderate_store_report_v1(uuid, text, text) from public, anon;
grant execute on function public.bo_moderate_store_report_v1(uuid, text, text) to authenticated;

revoke all privileges on function public.bo_is_admin_v1(uuid) from public, anon;
grant execute on function public.bo_is_admin_v1(uuid) to authenticated;

-- Analytics event table: append-only for canonical event types.
alter table public.analytics_events enable row level security;

drop policy if exists "Allow analytics insert" on public.analytics_events;
drop policy if exists analytics_events_insert_canonical on public.analytics_events;

revoke all privileges on table public.analytics_events from anon, authenticated;

grant insert on table public.analytics_events to anon, authenticated;

do $$
begin
  if to_regclass('public.analytics_events_id_seq') is not null then
    execute 'grant usage, select on sequence public.analytics_events_id_seq to anon, authenticated';
  end if;
end
$$;

create policy analytics_events_insert_canonical
on public.analytics_events
for insert
to anon, authenticated
with check (
  event_type in (
    'store_view',
    'store_opened',
    'website_clicked',
    -- Compatibility with current frontend analytics.
    -- These should be reviewed separately against the canonical analytics rules.
    'session_start',
    'user_login',
    'map_viewport',
    'search'
  )
);

-- Analytics summary/internal tables should not be directly public mutable.
revoke all privileges on table public.analytics_store_daily from anon, authenticated;
revoke all privileges on table public.analytics_stores from anon, authenticated;

-- Moderation/log internals should not be directly public/authenticated.
revoke all privileges on table public.store_content_flags from anon, authenticated;
revoke all privileges on table public.store_flag_logs from anon, authenticated;
revoke all privileges on table public.store_report_events from anon, authenticated;

-- Queue/translation/user-event internals should not be public by default.
revoke all privileges on table public.store_photo_queue from anon, authenticated;
revoke all privileges on table public.store_translations from anon, authenticated;
revoke all privileges on table public.user_events from anon, authenticated;

-- Backup/log snapshots should never be public.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'photo_log_backup_2025_10_29',
    'store_flag_logs_backup_2025_10_29',
    'stores_backup_2025_10_29',
    'stores_photo_backup_2025_12_28',
    'stores_photo_backup_2025_12_29',
    'stores_photo_backup_2025_12_30',
    'stores_photo_backup_2025_12_31',
    'stores_photo_backup_2026_01_01',
    'stores_photo_backup_2026_01_02',
    'stores_photo_backup_2026_01_03',
    'stores_photo_repair_batch_2026_01_16',
    'trash_log_backup_2025_10_29',
    'temp_city_geoname_map',
    'temp_geonames_aliases'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'revoke all privileges on table public.%I from anon, authenticated',
        table_name
      );
    end if;
  end loop;
end
$$;

-- Pending submissions:
-- Public visitors may submit. They should not read the pending queue.
drop policy if exists allow_read_store_pending on public.store_pending;
drop policy if exists store_pending_admin_select on public.store_pending;

revoke select, update, delete, truncate on table public.store_pending from anon;
revoke update, delete, truncate on table public.store_pending from authenticated;

grant insert on table public.store_pending to anon, authenticated;
grant select on table public.store_pending to authenticated;

create policy store_pending_admin_select
on public.store_pending
for select
to authenticated
using (public.bo_is_admin_v1(auth.uid()));

-- TRUNCATE is not controlled by row-level policies. Remove it from public API roles.
revoke truncate on table public.stores from anon, authenticated;
revoke truncate on table public.store_comments from anon, authenticated;
revoke truncate on table public.store_favorites from anon, authenticated;
revoke truncate on table public.ratings from anon, authenticated;
revoke truncate on table public.store_reviews from anon, authenticated;
revoke truncate on table public.store_reports from anon, authenticated;
revoke truncate on table public.store_report_actions from anon, authenticated;

commit;

-- Verification query:
-- Expected shape after this fix:
--   - no anon/authenticated write grants on RLS-disabled internal tables
--   - analytics_events: INSERT only, RLS enabled
--   - store_pending: anon INSERT only; authenticated INSERT/SELECT; RLS enabled
select
  g.grantee,
  g.table_name,
  g.privilege_type,
  c.relrowsecurity as rls_enabled
from information_schema.role_table_grants g
join information_schema.tables t
  on t.table_schema = g.table_schema
 and t.table_name = g.table_name
left join pg_namespace n
  on n.nspname = g.table_schema
left join pg_class c
  on c.relname = g.table_name
 and c.relnamespace = n.oid
where g.table_schema = 'public'
  and g.grantee in ('anon', 'authenticated', 'public')
  and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  and t.table_type = 'BASE TABLE'
  and (
    g.table_name in (
      'stores',
      'store_pending',
      'analytics_events',
      'analytics_store_daily',
      'analytics_stores',
      'bo_admins',
      'wcl_admins',
      'store_report_events',
      'store_content_flags',
      'store_flag_logs',
      'store_photo_queue',
      'store_translations',
      'user_events'
    )
    or g.table_name like '%backup%'
    or g.table_name like 'temp_%'
  )
order by g.table_name, g.grantee, g.privilege_type;

-- Function execute verification:
select
  routine_name as function_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'approve_store_pending',
    'bo_is_admin_v1',
    'bo_moderate_store_report_v1'
  )
  and grantee in ('anon', 'authenticated', 'PUBLIC', 'public')
order by routine_name, grantee, privilege_type;
