# WCL Launch Readiness Audit

Initial Codex audit date: 2026-05-15

## Current Baseline

- Repository: `worldcigarlocator-maker/Worldcigarlocator`
- Default branch from GitHub metadata: `Main-1`
- Local working branch: `codex-launch-readiness`
- App type: static HTML/CSS/JavaScript frontend with Supabase and Google Maps integrations.
- JavaScript syntax check: passed with `node --check` across `js/*.js`.
- Frontend runtime map: `docs/frontend-runtime-map.md`
- Supabase launch contract checklist: `docs/supabase-contract-needed.md`
- Supabase read-only audit query: `docs/supabase-readonly-launch-audit.sql`
- Supabase owner guide: `docs/supabase-dashboard-guide.md`
- Owner workflow: `docs/owner-workflow.md`
- Backoffice/admin audit: `docs/backoffice-admin-audit.md`

## Canonical Project Rules

The active WCL rules currently live in `agents.md`.

Key rules that must control launch work:

- Backend authority overrides frontend.
- No frontend aggregation.
- No frontend counts logic.
- Sidebar counts are backend-only.
- Analytics are append-only.
- No destructive changes without approval.
- Human moderation overrides automation.
- No assumptions.

Forbidden patterns:

- `LIMIT` in sidebar logic.
- Direct public frontend access to raw `stores`.
- Smart frontend geo logic.
- Auto moderation.
- Auto approval.
- Silent mutations.

Canonical frontend dataset:

- `stores_frontend_public_v5`

Canonical RPCs:

- `search_stores_v2`
- `sidebar_nodes_v3`
- `stores_within_bounds`
- `analytics_top_stores_v2`

## Immediate Findings

1. GitHub Pages workflow was only listening to `main`, while the repository default branch is `Main-1`.
   This can prevent deployment when launch changes are merged to the current default branch.

2. The canonical PDF documents referenced by `agents.md` are not present in the repository:
   - `WCL_Kickstart_CURRENT.pdf`
   - `WCL_Canonical_Spec_CURRENT.pdf`
   - `WCL_AI_Primer_CURRENT.pdf`
   - `WCL_Delta_Log_MASTER_v3.1.pdf`

3. `js/sidebar.js` does not use `.limit()`, but it does page through `sidebar_nodes_v3` with `.range()`.
   Counts are rendered from backend-provided `count` values.

4. Public discovery code uses the expected RPCs:
   - `js/cards.js` calls `search_stores_v2`.
   - `js/map.js` calls `stores_within_bounds`.
   - `js/sidebar.js` reads `sidebar_nodes_v3`.

5. Public add-store and analytics reads were moved away from raw `stores` to `stores_frontend_public_v5`.
   Remaining direct raw `stores` access is concentrated in `js/backoffice.js`, which must be confirmed admin-only and RLS-safe before launch.

6. `analytics.html` contained `supabaseAnonKey: "YOUR_KEY"` in `window.WCL_ANALYTICS_CFG`, while `js/analytics.js` imports the canonical client from `js/globals.js`.
   No repository references used `WCL_ANALYTICS_CFG`, so the stale inline config was removed.

7. Google Maps browser keys and Supabase anon keys are committed in frontend files.
   This can be acceptable only if those keys are public/browser keys with strict domain and API restrictions.

8. Analytics tracking failures were logging as crash-level console errors. Tracking must never affect rendering or moderation, so analytics network failures now log as warnings and debug payload logs are gated behind `window.WCL_DEBUG_ANALYTICS`.

9. Public discovery modules had launch-noisy development logs in `globals.js`, `main.js`, `cards.js`, and `modal.js`.
   These are now gated behind `window.WCL_DEBUG`, while real errors still use normal console error/warn paths.

10. Public Supabase contract smoke tests passed with the anon-key already present in `js/globals.js`.
    Verified views/RPCs: `stores_frontend_public_v5`, `sidebar_nodes_v3`, `search_stores_v2`, `stores_within_bounds`, `analytics_top_stores_v2`, `analytics_kpi_v2`, and `analytics_sessions_v1`.

11. Add-store city suggestions and duplicate checks no longer read raw `stores`; they now use `stores_frontend_public_v5`.

12. `i18n.js` now checks that the active `window.supabase` object is the initialized WCL client before trying to load profile language.
    This prevents add-store pages from logging a startup error when only the Supabase CDN SDK has loaded.

13. `analytics.js` store dossier loading now reads from `stores_frontend_public_v5` instead of raw `stores`.

14. Backoffice/admin flows are mapped in `docs/backoffice-admin-audit.md`.
    Frontend has a `bo_is_admin_v1` gate, but DB-level RLS/function definitions are still required before launch sign-off.

15. Owner-provided Supabase policy results are recorded in `docs/supabase-owner-results.md`.
    Current follow-up risk areas are `store_pending` public reads, broad authenticated reads on `stores`, inactive RLS on `analytics_events`, and missing grants/permissions visibility.

## Launch Blockers To Resolve

- Add or provide the four canonical PDFs, or replace them with current Markdown equivalents.
- Confirm which branch should be production: `Main-1`, `main`, or a renamed branch.
- Confirm hosting target: GitHub Pages, Vercel, Netlify, Cloudflare Pages, or another provider.
- Confirm Supabase RLS and RPC definitions match the canonical frontend contract. Public response smoke tests passed, but schema/RLS definitions are still needed for launch confidence.
- Confirm public browser keys are restricted to the production domains.
- Review remaining direct `stores` access in `js/backoffice.js`; this appears admin-oriented but still needs RLS/admin verification.
- Confirm analytics tracking is not double-emitting events through both `analytics-tracker.js` and `analytics-frontend.js`.

## Local Workflow For Owner Review

1. Open this folder in VS Code:
   `/Users/andreasbagler/Documents/Codex/2026-05-15/jag-har-ett-stort-projekt-som/Worldcigarlocator`

2. Pull/sync when Codex pushes or commits changes.

3. Serve the static site locally from the repository root when needed:

   ```sh
   python3 -m http.server 4173
   ```

4. Open:
   `http://localhost:4173`

## Current Verification Commands

```sh
git status --short --branch
node --check js/*.js
```
