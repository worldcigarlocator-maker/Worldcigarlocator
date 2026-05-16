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
- Fixed the backoffice edit modal frame/scroll/image sizing and hardened edit-button click handling.
- Added a focused `store_comments` admin-delete policy draft for comment moderation review.
- Gated normal backoffice debug logs behind `window.WCL_DEBUG_BACKOFFICE` / `window.WCL_DEBUG` while keeping warnings and errors visible.
- Split pending submission actions from real store actions so pending IDs cannot trigger `stores` edit/delete/photo updates.
- Added a focused `store_pending` admin-reject policy draft for pending moderation review.
- Recorded post-fix pending reject verification and owner functional test.
- Removed the legacy public analytics batch sender from the active public page flow and kept `analytics-tracker.js` as the single event sender.
- Added a focused analytics admin RPC wrapper draft for dashboard RPCs blocked by the append-only `analytics_events` policy.
- Recorded post-fix analytics dashboard RPC execute verification.

## Verified

- `node --check` across `js/*.js`
- `git diff --check`
- Local browser checks for homepage, add-store, and analytics pages
- Read-only Supabase smoke checks for public dataset/RPC responses

## Not Ready To Merge Until

- The focused `store_comments` admin-delete policy is reviewed/applied if admins should delete user comments in backoffice.
- The analytics dashboard is reloaded and functionally verified after the admin RPC wrapper fix.
- Backoffice read/edit/approve/reject/comment-delete flows are functionally tested after Supabase remediation.
- Canonical PDFs or Markdown replacements are added/confirmed.
- Browser keys are confirmed restricted to production domains/API scopes.
- Production analytics ingest is verified after deployment.
- Remaining raw `stores` access in `js/backoffice.js` is confirmed admin-only and RLS-safe.
