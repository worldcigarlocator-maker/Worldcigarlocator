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

## Verified

- `node --check` across `js/*.js`
- `git diff --check`
- Local browser checks for homepage, add-store, and analytics pages
- Read-only Supabase smoke checks for public dataset/RPC responses

## Not Ready To Merge Until

- Backoffice/admin access is reviewed against Supabase RLS/admin rules.
- Canonical PDFs or Markdown replacements are added/confirmed.
- Browser keys are confirmed restricted to production domains/API scopes.
- Analytics ingest endpoint canonical URL is confirmed.
- Remaining raw `stores` access in `js/backoffice.js` is confirmed admin-only and RLS-safe.
