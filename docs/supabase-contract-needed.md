# Supabase Contract Needed For WCL Launch

Audit date: 2026-05-15

This document lists the Supabase information needed to finish WCL launch cleanup safely. Do not paste service-role keys into chat or commit secrets to GitHub.

## What Codex Needs

Read-only schema and policy information is enough for code review and launch validation:

- Tables and columns.
- Views and their definitions.
- RPC/function signatures and definitions.
- RLS enabled/disabled status.
- RLS policy names and policy expressions.
- Triggers that mutate `stores`, analytics, moderation, comments, ratings, or favorites.

## Public Anon-Key Verification

Codex ran read-only checks against Supabase with the public anon-key already present in `js/globals.js`.

Verified on 2026-05-15:

- `stores_frontend_public_v5`: `200 OK`
- `sidebar_nodes_v3`: `200 OK`
- `search_stores_v2`: `200 OK`
- `stores_within_bounds`: `200 OK`
- `analytics_top_stores_v2`: `200 OK`
- `analytics_kpi_v2`: `200 OK`
- `analytics_sessions_v1`: `200 OK`

Observed response contracts:

- `stores_frontend_public_v5` returns store fields including `id`, `name`, `address`, `city`, `country`, `country_iso2`, `continent`, `phone`, `website`, `type`, `types`, `access`, `approved`, `flagged`, `deleted`, `status`, `photo_reference`, `place_id`, `created_at`, `flag_reason`, and `state`.
- `sidebar_nodes_v3` returns `continent`, `country`, `country_iso2`, `state`, `city`, `count`, and `level`.
- `search_stores_v2` returns public store fields plus `comment_count`, `rating_count`, `rating_avg`, and `favorites_count`.
- `stores_within_bounds` returns map marker fields: `id`, `name`, `lat`, `lng`, `types`, `city`, and `country`.
- `analytics_top_stores_v2` returns `store_id`, `name`, `city`, `country`, `state`, `views`, `clicks`, and `ctr`.
- `analytics_kpi_v2` returns `views`, `clicks`, and `ctr`.
- `analytics_sessions_v1` returns `sessions`.

Remaining Supabase validation still requires schema/RLS/function definitions, not just successful public calls.

## Canonical Public Contract

The public frontend should use these backend surfaces:

- View/table-like public dataset: `stores_frontend_public_v5`
- Sidebar source: `sidebar_nodes_v3`
- Search RPC: `search_stores_v2`
- Map bounds RPC: `stores_within_bounds`
- Analytics top stores RPC: `analytics_top_stores_v2`

## Required RPCs To Verify

Public discovery:

- `search_stores_v2`
- `sidebar_nodes_v3`
- `stores_within_bounds`
- `modal_store_card_v1`
- `modal_load_comments_v1`
- `modal_add_comment_v1`
- `modal_delete_comment_v1`
- rating/favorite RPCs called from `js/cards.js` and `js/modal.js`

Analytics:

- `analytics_top_stores_v2`
- `analytics_kpi_v2`
- `analytics_sessions_v1`
- `analytics_store_summary`
- `analytics_store_daily`
- any analytics ingest function or Edge Function used by `analytics-tracker.js`

Backoffice/admin:

- `bo_is_admin_v1`
- `stores_counts`
- `bo_list_store_reports_v1`
- `approve_store_pending`
- any Edge Function used by `js/backoffice.js`, `js/add-store.js`, `js/account.js`

## Required Tables / Views To Verify

Core:

- `stores`
- `stores_frontend_public_v5`
- `sidebar_nodes_v3`

Analytics:

- `analytics_events`
- any analytics aggregate views used by the RPCs above
- Edge Function endpoint for analytics ingest:
  - `js/analytics-frontend.js` currently calls `https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/analytics-ingest`
  - `js/analytics-tracker.js` currently calls `https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/functions/v1/analytics-ingest`
  - GitHub workflows use the Supabase project URL pattern `https://gbxxoeplkzbhsvagnfsr.supabase.co/functions/v1/...`
  - Supabase Edge Functions docs show the project URL pattern as `https://[YOUR_PROJECT_ID].supabase.co/functions/v1/function-name`: <https://supabase.com/docs/guides/functions/quickstart>
  - Confirm the canonical analytics ingest URL before changing event delivery.

User/community:

- `store_favorites`
- `ratings`
- `store_comments`
- account/profile tables used by `js/account.js`

Moderation/backoffice:

- report tables used by `js/bo-reports.js`
- pending/add-store tables or columns
- admin user/role tables or policies

## Safe SQL Snippets To Export Metadata

Run these in Supabase SQL Editor only if you are comfortable. They are read-only metadata queries.

List tables and views:

```sql
select
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema in ('public')
order by table_schema, table_name;
```

List columns:

```sql
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

List RPC/function signatures:

```sql
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
```

List view definitions:

```sql
select
  schemaname,
  viewname,
  definition
from pg_views
where schemaname = 'public'
order by viewname;
```

List RLS status:

```sql
select
  n.nspname as schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;
```

List RLS policies:

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

List triggers:

```sql
select
  event_object_schema,
  event_object_table,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
order by event_object_table, trigger_name;
```

## Checks Codex Will Perform With This Metadata

- Public reads cannot bypass `stores_frontend_public_v5` or canonical RPCs.
- `sidebar_nodes_v3` provides all counts without frontend aggregation.
- `search_stores_v2` applies approved/deleted filtering and geographic rules server-side.
- `stores_within_bounds` applies approved/deleted filtering server-side.
- Analytics event writes are append-only and cannot mutate rendering/moderation state.
- Analytics ingest endpoint is canonical and CORS-safe from `worldcigarlocator.com`.
- Moderation/admin writes require authenticated admin authority.
- Public submit/add-store flows cannot silently approve or mutate canonical production records.
