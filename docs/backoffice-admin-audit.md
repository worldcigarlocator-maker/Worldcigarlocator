# WCL Backoffice Admin Audit

Audit date: 2026-05-15

## Current Frontend Guard

Backoffice entrypoint:

- `backoffice.html`
- `js/backoffice.js`

Observed frontend flow:

1. `backoffice.html` starts with both login screen and app wrapper hidden.
2. `js/backoffice.js` creates a Supabase client with the public anon-key.
3. On page load it checks the current Supabase Auth session.
4. If no user exists, it shows the login screen.
5. If a user exists, it calls `bo_is_admin_v1` with the user id.
6. If the RPC errors or returns false, it signs out and shows login.
7. If the RPC returns true, it shows the backoffice app and loads approved stores.

This is a useful browser-side gate, but browser-side gates are not enough by themselves. Supabase RLS and admin RPC/function rules must still enforce the same authority server-side.

## Backoffice Data Access Observed

Read paths:

- `stores_counts` RPC for counts.
- `stores` table reads for approved, flagged, duplicate, deleted, and edit views.
- `store_pending` table reads for pending submissions.
- `store_comments` table reads while editing a store.
- `bo_list_store_reports_v1` RPC for pending report moderation queue.

Write/moderation paths:

- `approve_store_pending` RPC moves pending submissions into stores.
- `stores` table updates for edit/save.
- `stores` table updates for unflagging.
- `stores` table updates for trash/restore.
- `stores` table updates for photo repair.
- `store_comments` table delete for admin comment deletion.
- `bo_moderate_store_report_v1` RPC for report moderation.

## Launch-Safety Requirement

Every read/write path above must be enforced in Supabase, not only in `js/backoffice.js`.

Required DB checks:

- `bo_is_admin_v1` definition and source of admin truth.
- RLS status and policies for `stores`.
- RLS status and policies for `store_pending`.
- RLS status and policies for `store_comments`.
- RLS status and policies for report tables used by `bo_list_store_reports_v1`.
- Security mode for admin RPCs: whether each function is `security definer` or `security invoker`.
- Whether admin RPCs validate the current authenticated user internally, not only a supplied `p_uid`.

## Current Supabase Findings

Owner-provided RLS/policy results originally showed:

- `stores` has anonymous public reads limited to approved, non-deleted stores.
- `stores` has broad authenticated reads through `stores_authenticated_read`.
- No direct admin `stores` update policy was visible in the provided policy list.
- `store_pending` allows public inserts, which fits public add-store submission.
- `store_pending` also allows public reads with `SELECT true`, which may expose pending submissions before human review.
- `store_reports` and `store_report_actions` use `bo_is_admin_v1(auth.uid())`, which is the right shape for admin-only report moderation.

Remediation progress recorded in `docs/supabase-owner-results.md` now shows:

- `approve_store_pending` has an internal admin check and no longer exposes `anon`/`PUBLIC` execute grants.
- Direct anon/authenticated access to no-RLS internal tables was reduced.
- Direct anon/authenticated access to `wcl_admins` was removed.
- `store_pending` public reads were removed; authenticated admin reads use `bo_is_admin_v1(auth.uid())`.
- `stores` anonymous/authenticated reads are limited to approved, non-deleted stores unless the caller is an admin.
- `stores` admin insert/update paths use `bo_is_admin_v1(auth.uid())`.

Post-remediation verification now also shows:

- `store_comments` has the focused admin delete path required for backoffice comment moderation.
- Owner functionally tested comment deletion in the edit modal.
- `store_pending` has the focused authenticated delete grant plus RLS for admin pending rejection.
- Owner functionally tested `Reject Pending`.

## Current RPC Findings

Owner-provided function definitions show:

- `bo_is_admin_v1` is `SECURITY DEFINER` and checks `wcl_admins` against `auth.users`.
- `bo_moderate_store_report_v1` is `SECURITY DEFINER` and checks `auth.uid()` plus `bo_is_admin_v1()` before changing report status.
- `approve_store_pending` is `SECURITY DEFINER`, but it does not check `auth.uid()` or admin status before inserting into `stores` as `approved = true` and deleting the pending row.

`approve_store_pending` was therefore unsafe until it received an internal admin check and tighter function execute grants.

Post-fix owner verification shows this highest-risk RPC exposure is resolved.

## Direct Stores Access Review

Current code search shows direct `stores` table access only in `js/backoffice.js`.

Observed direct `stores` paths:

- Backoffice list loading through `reloadData`.
- Backoffice edit modal load by store id.
- Backoffice save/edit update.
- Backoffice unflag update.
- Backoffice trash/restore update.
- Backoffice photo repair update.

Conclusion:

- Public frontend discovery no longer reads raw `stores` directly.
- Remaining direct `stores` access is isolated to the admin backoffice surface.
- The verified `stores` RLS policies now match those backoffice needs:
  - public/normal users can read only approved, non-deleted rows;
  - admins can read and update through `bo_is_admin_v1(auth.uid())`;
  - service role keeps backend authority.

## Risk Notes

- `js/backoffice.js` uses the public anon-key, which is normal for browser apps, but this means database policies must do the real protection.
- If any authenticated non-admin user can update `stores`, `store_pending`, `store_comments`, or report tables directly, the frontend guard is not sufficient.
- If `approve_store_pending` or `bo_moderate_store_report_v1` trusts input without checking the caller's admin status, the RPC is unsafe.
- Pending submissions use `store_pending.id`, not `stores.id`; this is now guarded in the UI by separate pending-only actions.

## Current Codex Position

Backoffice `stores`, `store_pending`, and approval authority has been reviewed through owner-provided Supabase verification.

Next admin-specific follow-up:

- Functionally test the remaining backoffice read/edit/approve/reject paths after the Supabase remediation.
- Verify production analytics ingest after deployment.

Safe frontend-only changes already completed elsewhere:

- Public discovery/add-store/analytics reads now avoid raw `stores` where possible.
- Remaining raw `stores` access is isolated to `js/backoffice.js` and covered by verified admin RLS.
