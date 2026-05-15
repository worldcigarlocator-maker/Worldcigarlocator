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
