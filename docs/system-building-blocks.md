# WCL System Building Blocks

This document explains the main building blocks that create World Cigar Locator.
It is written for handover, buyer review, investor review, and future technical
work.

## High-Level Product Shape

World Cigar Locator is a static web application powered by Supabase and a small
set of server-side functions.

```text
User Browser
  -> Static pages: HTML, CSS, JavaScript
  -> Supabase Auth and public API calls
  -> Google Maps and Places APIs

Supabase
  -> PostgreSQL database
  -> Views and RPCs that control public data access
  -> Auth, RLS policies, triggers, and admin functions
  -> Edge Functions for protected server-side actions

External Services
  -> Google Maps / Places / Photos
  -> OpenAI moderation
  -> Resend email delivery
```

## Public Frontend

The public website is built from static files in the repository. There is no
traditional server-rendered frontend application.

Main files:

- `index.html` - public discovery experience.
- `css/` - visual styling for pages and components.
- `js/` - browser runtime modules.
- `images/` and `assets/` - brand, hero, flags, and visual assets.
- `locales/` - language and translation data.

Main user-facing features:

- Landing/start gate.
- Account creation and sign-in.
- Cigar store and lounge search.
- Map and geography navigation.
- Listing cards and listing modal.
- Favorites, ratings, comments, and report listing.
- Public add-listing flow.

## Core Frontend Runtime Modules

The frontend is split into focused JavaScript modules.

- `js/main.js` - app boot, auth gate, shared public runtime setup.
- `js/cards.js` - listing card rendering and search state ownership.
- `js/sidebar.js` - geography navigation only.
- `js/search-v2.js` - canonical search flow.
- `js/map.js` - map behavior and marker rendering.
- `js/modal.js` - canonical listing modal, comments, ratings, favorites, and reports.
- `js/account.js` - account creation, login, profile, favorites, and account settings.
- `js/add-store.js` and `js/add-shared.js` - public listing submission flow.
- `js/analytics.js` and analytics funnel files - analytics workspace behavior.
- `js/backoffice.js` - admin listing and report moderation.

## Backend And Database

Supabase is the backend authority for the product.

Supabase provides:

- PostgreSQL tables for stores, users, reports, comments, favorites, analytics,
  moderation, and admin data.
- Views and RPCs that expose controlled public data.
- Auth for users and admins.
- Row Level Security policies for database protection.
- Security-definer RPCs for admin actions.
- Triggers for data consistency.

Important public/canonical backend surfaces:

- `stores_frontend_public_v5`
- `search_stores_v2`
- `sidebar_nodes_v3`
- `stores_within_bounds`
- `analytics_top_stores_v2`

Important admin/backend functions include:

- `bo_is_admin_v1`
- `approve_store_pending`
- `bo_list_store_reports_v1`
- `bo_moderate_store_report_v1`
- analytics RPCs used by the analytics workspace

## Edge Functions

Supabase Edge Functions are used when an action needs a server-side secret or a
trusted server step.

Active function source in this repository:

- `supabase/functions/moderate_comment_v1/index.ts`
- `supabase/functions/send_wcl_email_v1/index.ts`

Expected deployed function outside the current source tree:

- `submit_store_report_v1` - receives listing reports and applies server-side
  spam protection before writing to report tables.

Edge Functions protect:

- OpenAI API keys.
- Resend API keys.
- Trusted comment moderation.
- Transactional email sending.
- Report submission validation.

## External Services

WCL depends on these external services:

- Supabase: database, auth, policies, RPCs, Edge Functions, and secrets.
- Google Maps Platform: map display, place lookup, autocomplete, and photos.
- OpenAI: AI-assisted content moderation for comments.
- Resend: WCL transactional email delivery.
- GitHub: source control and review workflow.

## Main Product Workspaces

### Public Discovery

Files:

- `index.html`
- `js/main.js`
- `js/cards.js`
- `js/sidebar.js`
- `js/search-v2.js`
- `js/map.js`
- `js/modal.js`

Purpose:

- Let users discover cigar stores and lounges.
- Keep listing display controlled by canonical backend data.
- Keep reports, comments, ratings, and favorites tied to the listing modal.

### Add Listing

Files:

- `add-store.html`
- `js/add-store.js`
- `js/add-shared.js`

Purpose:

- Let visitors submit new stores and lounges.
- Send submissions into review instead of direct publication.
- Notify WCL by email when a new listing is submitted.

### My Account

Files:

- `account.html`
- `js/account.js`
- `css/account.css`

Purpose:

- Account creation and sign-in.
- Profile/display name management.
- Favorites and account settings.
- Documented placeholders for future session, contributor, and admin modules.

### Backoffice

Files:

- `backoffice.html`
- `js/backoffice.js`
- `css/backoffice.css`

Purpose:

- Admin review of listings.
- Pending listing approval/rejection.
- Store editing, trash/restore, photo repair, comments, and report moderation.

### Analytics

Files:

- `analytics.html`
- `js/analytics.js`
- `js/analytics-pdf.js`
- `js/funnel-market-v2.js`
- `js/funnel-stores-v2.js`
- `js/funnel-users.js`
- `css/analytics.css`
- `css/analytics-pdf.css`

Purpose:

- Market intelligence.
- Store intelligence.
- Member analytics.
- PDF exports for business review and sales-facing reporting.

## Authority Rules

These rules define how the building blocks should interact:

- Supabase/backend authority overrides frontend behavior.
- Public frontend must use canonical views/RPCs, not raw internal tables.
- Sidebar counts are backend-only.
- Analytics are append-only.
- Analytics must not influence moderation or listing approval.
- Human moderation overrides automation.
- Admin actions must be enforced by Supabase policies/RPCs, not only by UI.
- Secrets must live in Supabase or service dashboards, never in frontend code.

## Handover Notes

For a future developer or buyer, the fastest orientation path is:

1. Read `README.md`.
2. Read `project_map.md`.
3. Read this file.
4. Read `SECURITY.md`.
5. Read `docs/frontend-runtime-map.md`.
6. Review Supabase functions, policies, RPCs, and secrets in Supabase.

