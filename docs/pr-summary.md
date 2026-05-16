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
- Recorded owner functional verification that the analytics dashboard now works.
- Recorded owner launch-prep decisions: admins should delete comments, browser keys must be restricted, `Main-1` remains production for now, and documentation will be rebuilt after fixes.
- Recorded post-fix `store_comments` grant verification for backoffice comment moderation.
- Recorded owner functional verification that backoffice comment deletion works.
- Added a Google Maps browser key restriction guide for owner action in Google Cloud.
- Moved public map loading to the shared restricted Google Browser Key.
- Recorded owner verification that homepage Map View and Add Listing still work with the restricted shared Google Browser Key.
- Re-audited backoffice direct `stores` access and confirmed it is isolated to admin backoffice paths covered by verified RLS.
- Added a backoffice functional test checklist for the remaining owner click-test.
- Recorded owner verification that the final backoffice read/edit/approve/reject/delete-restore flows work.
- Added a report button to every public store card and wired it into the existing report modal flow.
- Added clearer report choices, browser-side duplicate/cooldown guards, and human-readable backoffice report labels.
- Updated the old report page so users report from the listing instead of emailing.
- Documented required server-side spam filtering for `submit_store_report_v1`.

## Verified

- `node --check` across `js/*.js`
- `git diff --check`
- Local browser checks for homepage, add-store, and analytics pages
- Read-only Supabase smoke checks for public dataset/RPC responses

## Not Ready To Merge Until

- Production analytics ingest is verified after deployment.
- The `submit_store_report_v1` Edge Function has a verified server-side spam filter.
- Project documentation is rebuilt after the remaining fixes.
