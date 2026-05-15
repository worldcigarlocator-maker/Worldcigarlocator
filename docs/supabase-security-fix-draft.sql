-- WCL Supabase Security Fix Draft
-- Date: 2026-05-15
--
-- Status:
--   Draft for owner review. Do not run until approved.
--
-- What this does:
--   - Removes direct public/authenticated access from internal no-RLS tables.
--   - Keeps analytics append-only by allowing INSERT only for canonical events.
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
  event_type in ('store_view', 'store_opened', 'website_clicked')
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
revoke all privileges on table public.photo_log_backup_2025_10_29 from anon, authenticated;
revoke all privileges on table public.store_flag_logs_backup_2025_10_29 from anon, authenticated;
revoke all privileges on table public.stores_backup_2025_10_29 from anon, authenticated;
revoke all privileges on table public.trash_log_backup_2025_10_29 from anon, authenticated;

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
