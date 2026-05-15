# Supabase Owner-Provided Results

Audit date: 2026-05-15

## Tables / Views Inventory

Owner provided the public schema table/view inventory from Supabase.

Initial observations:

- Canonical frontend surfaces exist:
  - `stores_frontend_public_v5`
  - `sidebar_nodes_v3`
- Core store table exists:
  - `stores`
- Add-store/pending flow table exists:
  - `store_pending`
- Community/user tables exist:
  - `store_comments`
  - `store_favorites`
  - `ratings`
  - `profiles`
- Analytics base/derived surfaces exist:
  - `analytics_events`
  - `analytics_store_daily`
  - many `analytics_*` views
- Backoffice/admin-related surfaces exist:
  - `bo_admins`
  - `wcl_admins`
  - `bo_store_reports_list_v1`
  - `bo_moderation_dashboard_v1`
- There are many backup/temp/legacy-looking tables:
  - `stores_backup_2025_10_29`
  - `stores_photo_backup_*`
  - `photo_log_backup_2025_10_29`
  - `store_flag_logs_backup_2025_10_29`
  - `temp_*`

Conclusion so far:

- The database contains both active and historical surfaces.
- Table/view names alone are not enough for launch sign-off.
- Next required results are RLS status, policies, and function/RPC definitions.

## Function / RPC Inventory

Owner provided a function/RPC inventory with function names, arguments, return types, and `security_definer` status.

Important observations:

- Backoffice/admin RPCs exist:
  - `bo_is_admin_v1`
  - `approve_store_pending`
  - `bo_list_store_reports_v1`
  - `bo_moderate_store_report_v1`
  - other `bo_*` report functions
- Analytics RPCs exist in many versions.
- Canonical analytics RPCs used by frontend exist:
  - `analytics_kpi_v2`
  - `analytics_sessions_v1`
  - `analytics_store_daily`
  - `analytics_store_summary`
  - `analytics_top_stores_v2`
- Several automatic moderation/approval trigger functions exist:
  - `auto_approve_stores`
  - `auto_approve_with_keywords`
  - `auto_flag_store`
  - `auto_moderate_store`

Risk note:

- WCL rules say no auto moderation and no auto approval.
- Function names alone do not prove these are active.
- Trigger inventory is required next to confirm whether these functions are currently attached to live tables.

Next required results:

- RLS status.
- RLS policies.
- Trigger inventory.
- Function definitions for admin-sensitive functions, especially `bo_is_admin_v1`, `approve_store_pending`, `bo_moderate_store_report_v1`, and any active `auto_*` trigger functions.

## Trigger Inventory

Owner provided trigger inventory from `information_schema.triggers`.

Important observations:

- No active triggers were listed for:
  - `auto_approve_stores`
  - `auto_approve_with_keywords`
  - `auto_moderate_store`
  - `auto_flag_store`
- This is good for the WCL rules:
  - No auto moderation.
  - No auto approval.
  - Human moderation overrides automation.
- Active `stores` triggers appear focused on normalization/consistency:
  - `trg_enforce_store_continent`
  - `trg_enforce_store_status_consistency`
  - `trg_fix_location_on_insert`
  - `trg_normalize_country_iso2`
  - `trg_normalize_store_city`
  - `trg_set_city_from_address`
  - `trigger_respect_flag`
  - `trigger_store_photo`
- Active review triggers update/log ratings:
  - `trg_log_review_event`
  - `trg_update_store_rating`
- Active timestamp triggers exist for:
  - `profiles`
  - `store_reports`

Conclusion so far:

- The concerning `auto_*` moderation/approval function names exist, but they do not appear attached as active triggers in the provided trigger inventory.
- Still need RLS status and policies to confirm who can insert/update/delete on the protected tables.

## RLS Status Inventory

Owner provided RLS status for public base tables.

Important tables with RLS enabled:

- `stores`
- `store_pending`
- `store_comments`
- `store_favorites`
- `ratings`
- `store_reviews`
- `store_reports`
- `store_report_actions`
- `profiles`

This is a good sign for the most sensitive frontend/community/backoffice-facing tables.

Important tables with RLS disabled that need follow-up:

- `analytics_events`
- `analytics_store_daily`
- `analytics_stores`
- `bo_admins`
- `wcl_admins`
- `store_report_events`
- `store_content_flags`
- `store_flag_logs`
- `store_photo_queue`
- `store_translations`
- `user_events`
- backup/temp tables such as `stores_backup_*`, `stores_photo_backup_*`, and `temp_*`

Risk note:

- RLS disabled does not automatically prove public exposure.
- It means protection depends on table grants/privileges and RPC/Edge Function access patterns.
- Next required results are policies and grants/permissions, especially for `bo_admins`, `wcl_admins`, `analytics_events`, `store_report_events`, and backup/temp tables.

## RLS Policy Inventory

Owner provided RLS policies for the public schema.

Good signs:

- `stores` has an anonymous public-read policy limited to approved, non-deleted stores.
- `stores` has an admin-only insert policy using `wcl_admins`.
- `store_reports` and `store_report_actions` use `bo_is_admin_v1(auth.uid())` for admin access.
- `profiles`, `store_favorites`, `store_comments`, `ratings`, and `store_reviews` mostly use "own user" rules for writes.
- `store_pending` allows public submission inserts, which matches the public add-store flow.

Risks / follow-up items:

- `analytics_events` has an insert policy, but RLS status shows RLS is disabled on `analytics_events`.
  That means the policy does not enforce protection unless RLS is enabled. We need grants/permissions to know what public users can actually do.
- `store_pending` has public `SELECT true`.
  That means pending store submissions may be readable before human review. This likely conflicts with the moderation model unless intentionally approved.
- `stores_authenticated_read` allows any signed-in user to read all `stores` rows.
  This may expose non-public store rows to ordinary members unless that is intentional.
- The provided policies do not show a direct `stores` update policy for admin users.
  Backoffice has direct update flows, so we need to confirm whether those actions work through RPCs, service-role-only infrastructure, or missing policies.
- `store_favorites` and `store_reviews` have duplicate/overlapping policies.
  This is not automatically unsafe, but it shows schema drift and should be simplified later.

Conclusion so far:

- The public discovery read path looks aligned: anonymous visitors only read approved, non-deleted `stores`.
- The pending/backoffice path is not ready for launch sign-off yet.
- The next required result is grants/permissions for anon, authenticated, and public roles.
