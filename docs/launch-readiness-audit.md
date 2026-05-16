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

16. Owner-provided focused base-table grants show broad anon/authenticated write permissions on multiple RLS-disabled tables, including admin, analytics, moderation/log, and backup tables.
    This is a hard launch blocker until Supabase grants/RLS are tightened.

17. Owner-provided function execute grants show `approve_store_pending` is executable by `anon` while the live function lacks an internal admin check.
    This is a hard launch blocker because the function approves pending listings as public stores.

18. Post-fix function execute verification shows admin-sensitive RPCs no longer expose `anon`/`PUBLIC` execute grants.
    Table grant verification is still required before removing the Supabase security blocker.

19. Post-fix table grant verification shows the first security fix closed most high-risk no-RLS table exposure, but `wcl_admins` remains directly accessible by anon/authenticated roles.
    A focused follow-up fix is required before launch.

20. Post-fix `wcl_admins` verification shows no direct anon/authenticated grants on `wcl_admins`.
    Remaining focused rows are `stores` with RLS enabled.

21. Final policy verification shows `analytics_events` and `store_pending` now have the intended narrower policies.
    `stores` still needs a focused policy follow-up because authenticated reads are broad and backoffice direct updates need an explicit admin update policy.

22. Post-fix stores grant verification shows `anon` has only `SELECT` on `stores`, while `authenticated` has `SELECT`, `INSERT`, and `UPDATE`, all under RLS.
    Stores policy verification is still needed to confirm the row-level rules.

23. Post-fix stores policy verification confirms public reads are limited to approved, non-deleted stores and admin insert/update/read paths use `bo_is_admin_v1`.

24. Backoffice edit modal layout was fixed so the edit panel has a bounded modal frame, controlled image sizing, internal scrolling, and stable edit-button handling.

25. Backoffice comment deletion needs a focused Supabase follow-up.
    The edit modal calls direct `store_comments` delete, while the previously provided policies showed own-comment deletion but no explicit admin delete policy.
    Draft: `docs/supabase-store-comments-admin-fix-draft.sql`.

26. Pending submissions were using the same card action renderer as real stores.
    Because `store_pending.id` and `stores.id` are separate ID spaces, a pending row with ID 10 could accidentally trigger a `stores` update for store ID 10.
    Backoffice now labels pending rows as `Pending ID` and only shows pending-safe actions: `Approve` and `Reject Pending`.
    Draft for admin reject permission: `docs/supabase-store-pending-admin-reject-draft.sql`.

27. Post-fix pending reject verification shows `store_pending` grants are launch-appropriate for the current flow:
    `anon` has only `INSERT`, while `authenticated` has `INSERT`, `SELECT`, and `DELETE`, all with RLS enabled.
    Owner confirmed `Reject Pending` works and no real store row was trashed during retest.

28. Public analytics tracking was simplified to one active event sender.
    `js/analytics-tracker.js` is now the active public tracking layer, while `js/analytics-frontend.js` is no longer imported by `js/main.js`.
    Modal opens now send `store_opened` through the canonical tracker, visible cards send `store_view`, and website clicks still send `website_clicked`.

29. Analytics dashboard testing after the security fix showed `permission denied for table analytics_events` from dashboard RPCs:
    `analytics_store_intelligence_v1`, `analytics_market_countries_v1`, and likely `analytics_market_cities_v1`.
    A focused SQL draft was added to wrap these as admin-checked SECURITY DEFINER RPCs without granting direct `SELECT` on `analytics_events`.
    Draft: `docs/supabase-analytics-admin-rpc-fix-draft.sql`.

30. Post-fix analytics dashboard RPC execute verification shows `authenticated EXECUTE` only for:
    `analytics_store_intelligence_v1`, `analytics_market_countries_v1`, and `analytics_market_cities_v1`.
    No `anon`/`PUBLIC` execute rows were shown.

31. Owner reloaded the analytics dashboard after the admin RPC wrapper fix and confirmed it works.
    The prior `permission denied for table analytics_events` errors are gone.
    The remaining `chart.umd.min.js.map` 404 is an external Chart.js source-map warning and not a WCL runtime failure.

32. Owner confirmed launch-prep decisions:
    admins should be able to delete user comments in backoffice;
    browser keys must be restricted before launch;
    current production branch is `Main-1`, with optional later cleanup to rename/standardize to `main`;
    project documentation should be rebuilt after the remaining fixes instead of preserving stale docs.

33. Post-fix `store_comments` grant verification shows the intended grant layer:
    `anon` has only `SELECT`, while `authenticated` has `SELECT`, `INSERT`, and `DELETE`, all with RLS enabled.

34. Owner functionally tested backoffice comment deletion after the focused `store_comments` admin-delete policy.
    Comment moderation from the edit modal now works.

35. Browser key restriction review found two public Google Maps browser keys:
    one for the public map and one for add-store/backoffice Places autocomplete.
    Added owner guide: `docs/browser-key-restriction-guide.md`.
    Supabase anon/publishable key remains browser-visible by design and is protected through RLS/grants/RPC policies, not domain restrictions.

36. Public map Google loading was moved to the same restricted Browser Key used by the add-store Places flow.
    This removes the second public Google browser key from active frontend code.
    Owner configured the Browser Key restrictions in Google Cloud and confirmed homepage map and Add Listing Google search still work.

37. Owner re-tested after the shared restricted Google Browser Key code change.
    Homepage Map View and Add Listing Google search/autocomplete both work.

38. Backoffice direct `stores` access was re-audited after Supabase remediation.
    Code search shows raw `stores` access is isolated to `js/backoffice.js`.
    These read/update paths match the verified `stores` RLS policies using `bo_is_admin_v1(auth.uid())`.

39. Added an owner-friendly checklist for the final backoffice read/edit/approve/reject test:
    `docs/backoffice-functional-test-checklist.md`.

40. Owner completed the final backoffice functional test checklist.
    Backoffice read, edit, approve, reject, delete/restore, and comment moderation flows work after the Supabase remediation.

41. Added a public report action to every store card.
    The card button opens the existing store modal directly into the report form, with clearer report choices and a light browser-side spam guard.
    The old report information page now points users back to the per-listing report flow instead of email submission.

42. Backoffice report labels now render human-readable issue names instead of raw report codes.
    The underlying report type values remain compatible with the existing `submit_store_report_v1` flow and report moderation RPCs.

43. Added server-side spam filter requirements for `submit_store_report_v1`:
    `docs/store-report-spam-filter-requirements.md`.
    The Edge Function source is not in this repository, so the true server-side spam filter still needs Supabase verification or implementation before launch.

44. Rebuilt the public start surface as a private beta lock above the real app.
    Removed the legacy hardcoded `js/start.js` access gate, added a branded beta landing surface with create account/sign in, kept the age gate in `js/main.js`, added a close control to the login modal, and implemented the cookie consent banner.
    The app container stays hidden/inert until Supabase reports an authenticated session, and sidebar/app boot is deferred until login.
    Public analytics now waits for cookie consent before sending events.

45. Rebuilt the analytics PDF export engine.
    The new export creates a clean cover page, executive summary, chart page, and paginated table pages.
    Export row selection now follows the active analytics KPI instead of mixing market and store rows.

46. Reworked account creation as a dedicated onboarding path.
    The beta landing Create account action now routes to `account.html?mode=signup`, the old create-account action was removed from the login popup, and account creation requires email, password, display name/alias, and acceptance of WCL conduct/legal-age rules before calling Supabase Auth.

## Launch Blockers To Resolve

- Verify production analytics ingest after deployment.
- Owner visual check of the rebuilt analytics PDF in the browser.
- Verify or implement the server-side spam filter in `submit_store_report_v1`.
- Rebuild project documentation after the remaining fixes; stale/canonical docs can be replaced then.
- Optional later cleanup: standardize the production branch name from `Main-1` to `main` and remove the extra branch.

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
