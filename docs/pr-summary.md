# PR Summary: Codex Launch Readiness

Pull request: <https://github.com/worldcigarlocator-maker/Worldcigarlocator/pull/3>

## Completed

- Added launch audit and owner workflow docs.
- Added frontend runtime map.
- Added Supabase contract checklist.
- Added backoffice/admin audit.
- Added a read-only Supabase launch audit SQL export.
- Added an owner-friendly Supabase Dashboard guide.
- Fixed GitHub Pages workflow so it also runs from the current default branch `Main-1`.
- Removed stale analytics inline config with `YOUR_KEY`.
- Gated public debug logs behind explicit debug flags.
- Made analytics tracking failures non-blocking and less noisy.
- Verified key public Supabase views/RPCs with the existing public anon-key.
- Moved add-store helper reads and analytics store detail reads away from raw `stores` to `stores_frontend_public_v5`.
- Fixed add-store i18n startup error when only the Supabase CDN SDK is present.
- Recorded owner-provided Supabase inventories for tables/views, functions, triggers, RLS status, and policies.
- Expanded the read-only Supabase audit query to include table grants/permissions.
- Recorded focused Supabase base-table grant findings; current DB permissions are not launch-safe.
- Added a draft Supabase security fix SQL file for owner review.
- Updated the fix draft to harden `approve_store_pending` with a server-side admin check.
- Recorded function execute grants confirming `approve_store_pending` is executable by `anon`.
- Confirmed Supabase backup exists from 2026-05-15 03:30 before remediation.
- Recorded post-fix function execute verification removing `anon`/`PUBLIC` from admin-sensitive RPCs.
- Added focused `wcl_admins` follow-up fix draft after post-fix table verification.
- Recorded post-fix `wcl_admins` verification showing no direct anon/authenticated grants.
- Added focused `stores` policy follow-up draft for authenticated reads and admin updates.
- Recorded post-fix `stores` grant verification.
- Recorded post-fix `stores` policy verification.

## Verified

- `node --check` across `js/*.js`
- `git diff --check`
- Local browser checks for homepage, add-store, and analytics pages
- Read-only Supabase smoke checks for public dataset/RPC responses

## Not Ready To Merge Until

- Backoffice/admin access is reviewed against Supabase RLS/admin rules.
- Backoffice read/edit/approve flows are functionally tested after Supabase remediation.
- Canonical PDFs or Markdown replacements are added/confirmed.
- Browser keys are confirmed restricted to production domains/API scopes.
- Analytics ingest endpoint canonical URL is confirmed.
- Remaining raw `stores` access in `js/backoffice.js` is confirmed admin-only and RLS-safe.
