-- WCL Supabase Read-Only Launch Audit
-- Date: 2026-05-15
--
-- Purpose:
--   Export schema, RLS, policy, trigger, and function metadata needed for
--   WCL launch review.
--
-- Safety:
--   This script only uses SELECT statements.
--   It does not insert, update, delete, approve, moderate, or mutate data.
--
-- How to use:
--   1. Open Supabase Dashboard.
--   2. Open the WCL project.
--   3. Go to SQL Editor.
--   4. Create a new query.
--   5. Paste this whole file.
--   6. Click Run.
--   7. Export/copy the result and give it to Codex.

with
target_tables as (
  select unnest(array[
    'stores',
    'stores_frontend_public_v5',
    'sidebar_nodes_v3',
    'store_pending',
    'store_comments',
    'store_favorites',
    'ratings',
    'analytics_events',
    'wcl_admins',
    'bo_admins',
    'store_report_events',
    'store_content_flags',
    'store_flag_logs',
    'store_photo_queue',
    'store_translations',
    'user_events'
  ]) as table_name
),
target_function_patterns as (
  select unnest(array[
    'bo_%',
    'approve_store_pending',
    'analytics_%',
    'search_stores_v2',
    'stores_within_bounds',
    'modal_%',
    'save_store_favorite_v1',
    'remove_store_favorite_v1',
    'is_store_favorited_v1',
    'submit_store_report_v1'
  ]) as pattern
),
tables as (
  select jsonb_agg(
    jsonb_build_object(
      'schema', table_schema,
      'name', table_name,
      'type', table_type
    )
    order by table_schema, table_name
  ) as data
  from information_schema.tables
  where table_schema = 'public'
),
columns as (
  select jsonb_agg(
    jsonb_build_object(
      'table', c.table_name,
      'column', c.column_name,
      'data_type', c.data_type,
      'is_nullable', c.is_nullable,
      'default', c.column_default
    )
    order by c.table_name, c.ordinal_position
  ) as data
  from information_schema.columns c
  where c.table_schema = 'public'
    and (
      c.table_name in (select table_name from target_tables)
      or c.table_name like 'store_%'
      or c.table_name like 'analytics_%'
      or c.table_name like 'bo_%'
    )
),
views as (
  select jsonb_agg(
    jsonb_build_object(
      'schema', schemaname,
      'name', viewname,
      'definition', definition
    )
    order by viewname
  ) as data
  from pg_views
  where schemaname = 'public'
    and (
      viewname in (select table_name from target_tables)
      or viewname like 'analytics_%'
      or viewname like 'bo_%'
      or viewname like 'store_%'
    )
),
rls_status as (
  select jsonb_agg(
    jsonb_build_object(
      'schema', n.nspname,
      'table', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity
    )
    order by c.relname
  ) as data
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and (
      c.relname in (select table_name from target_tables)
      or c.relname like 'store_%'
      or c.relname like 'analytics_%'
      or c.relname like 'bo_%'
    )
),
policies as (
  select jsonb_agg(
    jsonb_build_object(
      'schema', schemaname,
      'table', tablename,
      'policy', policyname,
      'permissive', permissive,
      'roles', roles,
      'command', cmd,
      'using', qual,
      'with_check', with_check
    )
    order by tablename, policyname
  ) as data
  from pg_policies
  where schemaname = 'public'
    and (
      tablename in (select table_name from target_tables)
      or tablename like 'store_%'
      or tablename like 'analytics_%'
      or tablename like 'bo_%'
    )
),
grants as (
  select jsonb_agg(
    jsonb_build_object(
      'grantee', grantee,
      'schema', table_schema,
      'table', table_name,
      'privilege', privilege_type,
      'is_grantable', is_grantable
    )
    order by table_name, grantee, privilege_type
  ) as data
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated', 'public')
    and table_name in (select table_name from target_tables)
),
base_table_grants as (
  select jsonb_agg(
    jsonb_build_object(
      'grantee', g.grantee,
      'schema', g.table_schema,
      'table', g.table_name,
      'privilege', g.privilege_type,
      'is_grantable', g.is_grantable,
      'rls_enabled', c.relrowsecurity
    )
    order by g.table_name, g.grantee, g.privilege_type
  ) as data
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
      g.table_name in (select table_name from target_tables)
      or g.table_name like 'store_%'
      or g.table_name like 'analytics_%'
      or g.table_name like 'bo_%'
      or g.table_name like '%backup%'
      or g.table_name like 'temp_%'
    )
),
functions as (
  select jsonb_agg(
    jsonb_build_object(
      'schema', n.nspname,
      'name', p.proname,
      'arguments', pg_get_function_arguments(p.oid),
      'result_type', pg_get_function_result(p.oid),
      'security_definer', p.prosecdef,
      'definition', pg_get_functiondef(p.oid)
    )
    order by p.proname
  ) as data
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and exists (
      select 1
      from target_function_patterns tfp
      where p.proname like tfp.pattern
    )
),
triggers as (
  select jsonb_agg(
    jsonb_build_object(
      'schema', event_object_schema,
      'table', event_object_table,
      'trigger', trigger_name,
      'event', event_manipulation,
      'timing', action_timing,
      'statement', action_statement
    )
    order by event_object_table, trigger_name
  ) as data
  from information_schema.triggers
  where event_object_schema = 'public'
    and (
      event_object_table in (select table_name from target_tables)
      or event_object_table like 'store_%'
      or event_object_table like 'analytics_%'
      or event_object_table like 'bo_%'
    )
)
select jsonb_pretty(
  jsonb_build_object(
    'generated_at', now(),
    'project', 'World Cigar Locator',
    'tables', coalesce((select data from tables), '[]'::jsonb),
    'columns', coalesce((select data from columns), '[]'::jsonb),
    'views', coalesce((select data from views), '[]'::jsonb),
    'rls_status', coalesce((select data from rls_status), '[]'::jsonb),
    'policies', coalesce((select data from policies), '[]'::jsonb),
    'grants', coalesce((select data from grants), '[]'::jsonb),
    'base_table_grants', coalesce((select data from base_table_grants), '[]'::jsonb),
    'functions', coalesce((select data from functions), '[]'::jsonb),
    'triggers', coalesce((select data from triggers), '[]'::jsonb)
  )
) as wcl_launch_audit_json;
