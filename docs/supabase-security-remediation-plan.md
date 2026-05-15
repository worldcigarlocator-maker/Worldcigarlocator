# Supabase Security Remediation Plan

Draft date: 2026-05-15

Status: draft only. Do not run these changes until the owner approves and a backup/export exists.

Draft SQL file:

- `docs/supabase-security-fix-draft.sql`

## Why This Is Needed

Focused grant results show broad anon/authenticated privileges on several base tables where RLS is disabled.

This conflicts with WCL launch rules:

- Backend authority overrides frontend.
- Analytics are append-only.
- Human moderation overrides automation.
- No silent mutations.

## Immediate Launch Blockers

High-risk no-RLS tables with broad public/authenticated grants:

- `bo_admins`
- `analytics_store_daily`
- `analytics_stores`
- `store_content_flags`
- `store_flag_logs`
- `photo_log_backup_2025_10_29`
- `store_flag_logs_backup_2025_10_29`

Also high-risk:

- `analytics_events` has public/authenticated direct `INSERT` and `SELECT` while RLS is disabled.
- `store_pending` has RLS enabled, but the current public `SELECT true` policy appears to expose pending submissions before human review.
- `approve_store_pending` is `SECURITY DEFINER` but does not check `auth.uid()` or admin status before approving a pending store.
- Backup confirmed by owner: Supabase has a backup from 2026-05-15 03:30.

## Intended Safe Shape

- Public visitors read public store data only through `stores_frontend_public_v5`, `sidebar_nodes_v3`, and canonical RPCs.
- Public visitors submit new stores only into `store_pending`.
- Pending submissions are not publicly readable.
- Analytics writes go through Edge Functions or controlled RPCs.
- Analytics tables are not directly readable or mutable by anon/authenticated users unless explicitly required.
- The first security fix keeps known current analytics inserts working. Canonical analytics cleanup remains separate.
- Admin lists and admin truth tables are never public.
- Admin RPCs enforce admin status inside the function, not only through the frontend.
- Backup/temp tables are never public.

## Draft SQL Direction

The current full review draft is in:

- `docs/supabase-security-fix-draft.sql`

Do not copy older snippets from this plan. The fix draft is the source to review because it also hardens `approve_store_pending`.

## Required Follow-Up

After any remediation, re-run the focused grants query and confirm:

- No anon/authenticated write grants remain on RLS-disabled base tables.
- `bo_admins` and `wcl_admins` are not directly public.
- Backup/temp tables are not directly public.
- `analytics_events` direct access matches the chosen ingest architecture.
- `store_pending` cannot be publicly read before review.

## Still Needed Before Final DB Fix

- Confirm whether `analytics_events` is written only by Edge Functions.
- Confirm whether `wcl_admins` appears in focused grants.
- Confirm all backup/temp table names that should be locked down.
- Review definitions for `bo_is_admin_v1`, `approve_store_pending`, and `bo_moderate_store_report_v1`.
