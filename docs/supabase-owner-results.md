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
