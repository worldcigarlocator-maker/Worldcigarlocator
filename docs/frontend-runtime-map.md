# WCL Frontend Runtime Map

Audit date: 2026-05-15

This map separates the active browser entrypoints from helper modules and likely legacy/parallel analytics modules.

## Public Discovery

Primary page:

- `index.html`

Loaded directly by `index.html`:

- `js/main.js`
- `js/search-v2.js`
- `js/map.js`
- `https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js`

Runtime modules imported by the public discovery flow:

- `js/globals.js` - Supabase client and shared image resolver.
- `js/sidebar.js` - location navigation only.
- `js/cards.js` - search state owner and card rendering.
- `js/modal.js` - canonical modal rendering.
- `js/store-ui.js` - shared store card/modal display helpers.
- `js/map-pins.js` - map pin rendering helpers.
- `js/analytics-tracker.js` - canonical event tracking layer.
- `js/analytics-frontend.js` - loaded from `main.js` through the page flow and still needs final classification.
- `js/start.js` - age/access gate.
- `js/i18n.js` - locale loading and translation.

Canonical backend contract observed in public discovery:

- Sidebar reads `sidebar_nodes_v3`.
- Cards call `search_stores_v2`.
- Map calls `stores_within_bounds`.
- Cards global total reads `stores_frontend_public_v5` with `head: true`.
- Modal comments and rating flows use `modal_*` RPCs.

## Account

Primary page:

- `account.html`

Loaded directly:

- `js/globals.js`
- `js/i18n.js`
- `js/modal.js`
- `js/account.js`

Notes:

- Account uses Supabase Auth and user-specific tables such as favorites/profile-related flows.
- Account behavior should remain separate from public discovery rules unless it affects rendering of public store lists.

## Add Store

Primary pages:

- `add-store.html`
- `add-store-backoffice.html`

Loaded directly:

- `js/add-shared.js`
- `js/add-store.js`
- Supabase CDN client.
- Google Places browser script.

Notes:

- `add-store.html` appears public-facing.
- `add-store-backoffice.html` appears admin/backoffice-facing.
- Duplicate checks and city suggestions currently read raw `stores`; these need Supabase/RLS review before launch.

## Backoffice

Primary page:

- `backoffice.html`

Loaded directly:

- `js/backoffice.js`
- Supabase CDN client.

Notes:

- Raw `stores` reads/writes appear expected here only if protected by Supabase Auth, RLS, and admin RPC checks.
- The file calls `bo_is_admin_v1` and several backoffice RPCs.
- Backoffice has many debug logs and should be cleaned after behavior is confirmed.

## Analytics Dashboard

Primary page:

- `analytics.html`

Loaded directly:

- `js/analytics.js`
- Supabase CDN client.
- Chart.js, html2canvas, jsPDF.

Runtime modules:

- `js/analytics-state.js`
- `js/funnel-users.js`
- `js/funnel-market-v2.js`
- `js/funnel-stores-v2.js`
- `js/analytics-pdf.js`

Notes:

- `analytics.html` had a stale `window.WCL_ANALYTICS_CFG` block with `supabaseAnonKey: "YOUR_KEY"`.
- `js/analytics.js` imports the canonical Supabase client from `js/globals.js`, so the stale inline config was removed.
- Analytics currently includes one raw `stores` read for store dossier loading; this needs backend/RLS classification before launch.

## Standalone Content Pages

Pages with local inline translation/content loading:

- `about.html`
- `privacy.html`
- `legal.html`
- `report.html`
- `reports.html`
- `logo.html`
- `reset-password.html`

Notes:

- `reset-password.html` creates a Supabase client inline.
- Legal/about/privacy content also exists under `locales/pages`.

## Potential Legacy Or Parallel Files

These files are present but not directly loaded by the main public page:

- `js/funnel-market.js`
- `js/funnel-stores.js`
- `js/funnel-stores-v2.js`
- `js/funnel-market-v2.js`
- `js/funnel-users.js`
- `js/analytics-frontend.js`
- `js/view-dedupe.js`

Some are imported by analytics or tracking flows. Do not delete them until imports and runtime behavior are verified in browser.

## Launch Cleanup Candidates

- Continue removing or guarding debug-only console logs outside the public discovery modules.
- Confirm `analytics-frontend.js` and `analytics-tracker.js` are not double-counting the same canonical events.
- Confirm raw `stores` reads are limited to admin/dashboard flows protected by RLS or converted to canonical RPCs/views.
- Confirm all browser API keys are restricted by domain and API scope.

## Debug Flags

- `window.WCL_DEBUG = true` enables public frontend debug logs.
- `window.WCL_DEBUG_ANALYTICS = true` enables analytics payload debug logs.

Both flags are off by default.
