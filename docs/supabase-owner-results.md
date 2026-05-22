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

## Grants / Permissions Inventory

Owner started providing table/view grants for anon, authenticated, and public roles.

Partial observation:

- The first output contained many analytics views with broad anon/authenticated grant rows, including write-looking privileges such as `INSERT`, `UPDATE`, and `DELETE`.
- Because those rows are on views, not all write-looking grants are necessarily exploitable. Some views are not updatable.
- The output is too broad to use directly for launch sign-off.

Conclusion so far:

- We need a smaller grant query focused on base tables and high-risk public/authenticated privileges.
- High-risk tables are `stores`, `store_pending`, `analytics_events`, admin tables, report/moderation tables, user event tables, and backup/temp tables.
- For launch sign-off, any public/authenticated write grants on base tables must be explained by RLS policies or removed.

## Focused Base Table Grants

Owner provided a focused base-table grant result.

Critical launch blockers found:

- `bo_admins` has anon/authenticated `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE`, with RLS disabled.
- `analytics_store_daily` has anon/authenticated `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE`, with RLS disabled.
- `analytics_stores` has anon/authenticated `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE`, with RLS disabled.
- `store_content_flags` has anon/authenticated `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE`, with RLS disabled.
- `store_flag_logs` has anon/authenticated `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE`, with RLS disabled.
- Backup/log tables such as `photo_log_backup_2025_10_29` and `store_flag_logs_backup_2025_10_29` also have broad anon/authenticated grants with RLS disabled.
- `analytics_events` has anon/authenticated `INSERT` and `SELECT`, with RLS disabled.

Additional notes:

- `store_comments`, `store_favorites`, and `store_pending` have broad grant rows, but RLS is enabled on those tables.
  Those still need cleanup, especially `TRUNCATE` grants and the public `store_pending` read policy, but they are less urgent than no-RLS tables.
- Frontend analytics appears to send events through Edge Functions, not by direct table writes to `analytics_events`.
  This supports moving analytics writes behind server-side authority instead of granting direct public table access.

Conclusion:

- This is a hard launch blocker.
- Do not merge the PR or launch publicly until Supabase grants/RLS are tightened.
- Prepare a reviewed Supabase remediation migration before making database changes.

## Admin Function Definition Review

Owner provided definitions for `approve_store_pending`, `bo_is_admin_v1`, and `bo_moderate_store_report_v1`.

Findings:

- `bo_is_admin_v1` is `SECURITY DEFINER` and checks `wcl_admins` against `auth.users`.
- `bo_moderate_store_report_v1` checks `auth.uid()` and calls `bo_is_admin_v1()` before updating reports. This is the right server-side shape.
- `approve_store_pending` is `SECURITY DEFINER` but does not check `auth.uid()` or admin status.
- `approve_store_pending` inserts pending rows into `stores` with `approved = true`.
- The current `approve_store_pending` catches insert errors and still deletes the pending row afterward. That can silently lose pending submissions.

Conclusion:

- `approve_store_pending` is a launch blocker unless function execute privileges are proven admin-only.
- The safer remediation is to replace `approve_store_pending` with a version that checks `auth.uid()` and `bo_is_admin_v1()` internally, and only deletes the pending row after a successful insert.

## Function Execute Grants

Owner provided function execute grants for admin-sensitive RPCs.

Critical launch blocker confirmed:

- `approve_store_pending` can be executed by `anon`.
- `approve_store_pending` can be executed by `authenticated`.
- `approve_store_pending` has no internal admin check in the current live definition.

Other execute grants:

- `bo_is_admin_v1` can be executed by `PUBLIC`, `anon`, and `authenticated`.
- `bo_moderate_store_report_v1` can be executed by `anon` and `authenticated`, but the function definition checks `auth.uid()` and admin status internally.

Conclusion:

- `approve_store_pending` is currently the highest-risk function because public callers can execute a `SECURITY DEFINER` function that approves pending listings.
- The fix draft must replace `approve_store_pending` with a version that checks admin status internally and revoke `anon`/`PUBLIC` execute grants.

## Post-Fix Function Execute Verification

Owner ran the security fix draft and provided the function execute verification result.

Result:

- `approve_store_pending`: `authenticated` has `EXECUTE`.
- `bo_is_admin_v1`: `authenticated` has `EXECUTE`.
- `bo_moderate_store_report_v1`: `authenticated` has `EXECUTE`.
- No `anon` execute rows were shown for these admin-sensitive functions.
- No `PUBLIC` execute rows were shown for these admin-sensitive functions.

Conclusion:

- The highest-risk function execute issue appears fixed.
- Still need the table grants verification result from the same SQL run to confirm the no-RLS table exposure is fixed.

## Post-Fix Table Grants Verification

Owner provided the table grants verification after running the first security fix.

Good results:

- `analytics_events` now has only `INSERT` for `anon` and `authenticated`, with RLS enabled.
- `store_pending` now has `INSERT` for `anon` and `authenticated`, with RLS enabled.
- `store_pending` has `SELECT` for `authenticated`, with RLS enabled and an admin-only select policy.
- The previously exposed no-RLS tables such as `bo_admins`, `analytics_store_daily`, `analytics_stores`, `store_content_flags`, `store_flag_logs`, and backup tables were not shown in the focused result.

Remaining blocker:

- `wcl_admins` still has anon/authenticated `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE`, with RLS disabled.

Notes:

- `stores` still shows broad grants for `anon` and `authenticated`, but RLS is enabled.
  Based on the owner-provided policies, anonymous `stores` reads remain limited to approved, non-deleted rows, and inserts are admin-gated.
- The `wcl_admins` exposure cannot remain for launch because it is the admin truth table used by `bo_is_admin_v1`.

Conclusion:

- The first fix closed most of the high-risk exposure.
- A focused follow-up fix is required to lock down `wcl_admins`.

## Post-Fix wcl_admins Verification

Owner ran the focused `wcl_admins` follow-up fix and provided the verification result.

Result:

- No `wcl_admins` rows were shown.
- Only `stores` rows remained in the focused check.
- All remaining `stores` rows showed `rls_enabled = true`.

Conclusion:

- Direct public/authenticated table access to `wcl_admins` appears removed.
- The original no-RLS admin-table exposure is resolved.
- `stores` still has broad table grants, but RLS is enabled and must continue to enforce the actual read/write rules.

## Final Policy Verification

Owner provided final policies for `analytics_events`, `store_pending`, and `stores` after remediation.

Good results:

- `analytics_events` now has insert-only RLS for known frontend event types.
- `store_pending` allows public/authenticated inserts.
- `store_pending` select is limited to authenticated admins through `bo_is_admin_v1(auth.uid())`.
- `stores` anonymous select is limited to approved, non-deleted stores.
- `stores` insert is admin-only through `bo_is_admin_v1(auth.uid())`.

Remaining follow-up:

- `stores_authenticated_read` currently allows any authenticated user to read all `stores` rows with `qual = true`.
- No explicit admin `UPDATE` policy was shown for `stores`, but the current backoffice uses direct `stores` updates for edit/unflag/trash/photo repair.

Conclusion:

- A focused stores policy follow-up is needed.
- Normal authenticated users should be limited to approved, non-deleted stores.
- Admin users should be allowed to read and update all stores via `bo_is_admin_v1`.

## Post-Fix Stores Grants Verification

Owner ran the focused stores policy follow-up and provided the table grants result.

Result:

- `anon` has `SELECT` on `stores`, with RLS enabled.
- `authenticated` has `SELECT`, `INSERT`, and `UPDATE` on `stores`, with RLS enabled.
- `anon` no longer shows `INSERT`, `UPDATE`, or `DELETE` on `stores`.
- No `TRUNCATE` grants were shown.

Conclusion:

- The stores table grants now look launch-appropriate as a grant layer.
- RLS policies still need separate verification because grants alone do not show the row-level rules.

## Post-Fix Stores Policy Verification

Owner provided stores policies after the focused stores follow-up.

Result:

- `stores_public_read` allows `anon` SELECT only where `approved = true` and `deleted = false`.
- `stores_authenticated_read` allows authenticated SELECT only for approved, non-deleted stores or admins via `bo_is_admin_v1(auth.uid())`.
- `bo_insert_stores_admin_only` allows authenticated INSERT only for admins via `bo_is_admin_v1(auth.uid())`.
- `stores_admin_update` allows authenticated UPDATE only for admins via `bo_is_admin_v1(auth.uid())`.
- `stores_service_all` remains available to `service_role`.

Conclusion:

- Stores RLS now matches the intended split:
  - public users see public stores only;
  - normal signed-in users see public stores only;
  - admins can read and update all stores for backoffice.
- Supabase authority checks are now aligned with the backoffice admin model for `stores`.

## Post-Fix Backoffice Comment Moderation Verification

Backoffice edit modal reads and deletes rows from `store_comments`.

Original owner-provided policies showed:

- public comment reads are allowed;
- authenticated users can insert their own comments;
- users can delete their own comments.

Owner confirmed admins should be able to delete comments written by other users.
Draft applied: `docs/supabase-store-comments-admin-fix-draft.sql`.

Owner-provided post-fix grant verification showed:

- `anon` has only `SELECT` on `store_comments`;
- `authenticated` has `SELECT`, `INSERT`, and `DELETE` on `store_comments`;
- RLS is enabled on `store_comments`.

Conclusion:

- Store editing is now covered by verified `stores` RLS.
- The grant layer now matches the intended public/admin split for comments.
- Admin delete authority is enforced through the RLS policy that checks `bo_is_admin_v1(auth.uid())`.
- Owner confirmed a real backoffice comment-delete click test works.
- Backoffice comment moderation is no longer an open launch blocker.

## Post-Fix Pending Rejection Verification

Backoffice pending submissions live in `store_pending`.

Important rule:

- `store_pending.id` is not a `stores.id`.
- These two tables have separate ID sequences.
- Backoffice must not use pending IDs for real store edit/delete/photo actions.

Frontend fix:

- Pending cards now display `Pending ID`.
- Pending cards only show pending-safe actions: `Approve` and `Reject Pending`.
- Real store cards no longer show the pending approval action.

Remaining database follow-up:

- Owner ran the focused pending reject SQL draft.
- Verification showed `anon` has only `INSERT` on `store_pending`.
- Verification showed `authenticated` has `INSERT`, `SELECT`, and `DELETE` on `store_pending`.
- RLS is enabled on `store_pending`.

Functional test:

- Owner confirmed `Reject Pending` works correctly in backoffice.
- No real `stores` row was moved to Trash during the retest.

Conclusion:

- Pending rejection is now separated from real store delete/restore behavior.
- The ID collision risk between `store_pending.id` and `stores.id` is resolved in the current frontend flow.

## Post-Fix Analytics Dashboard RPC Verification

Owner tested the analytics dashboard after public analytics tracking was consolidated.

Observed browser errors:

- `analytics_store_intelligence_v1`: `permission denied for table analytics_events`.
- `analytics_market_countries_v1`: RPC error in `funnel-market-v2.js`.
- `analytics_market_cities_v1` is likely affected by the same pattern because it is part of the same dashboard flow.

Cause:

- `analytics_events` is now intentionally append-only for browser roles.
- Some dashboard RPCs were still `SECURITY INVOKER`, so they tried to read `analytics_events` with the browser user's direct table privileges.

Conclusion:

- Do not grant direct `SELECT` on `analytics_events` to browser roles.
- Dashboard analytics should be read through admin-checked `SECURITY DEFINER` RPC wrappers.
- Draft: `docs/supabase-analytics-admin-rpc-fix-draft.sql`.

Owner then ran the focused analytics admin RPC wrapper draft and provided function execute verification.

Result:

- `analytics_market_cities_v1`: `authenticated` has `EXECUTE`.
- `analytics_market_countries_v1`: `authenticated` has `EXECUTE`.
- `analytics_store_intelligence_v1`: `authenticated` has `EXECUTE`.
- No `anon` execute rows were shown for these dashboard RPCs.
- No `PUBLIC` execute rows were shown for these dashboard RPCs.

Conclusion:

- Dashboard RPC execute grants now have the intended grant shape.
- The wrappers still rely on their internal `bo_is_admin_v1(auth.uid())` checks for admin-only authority.
- Owner reloaded the analytics dashboard and confirmed it works.
- The previous `permission denied for table analytics_events` browser errors are gone.
- The remaining `chart.umd.min.js.map` 404 is an external Chart.js source-map warning and not a WCL runtime failure.
