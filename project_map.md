# World Cigar Locator Project Map

This document gives a high-level map of the active WCL application. It is meant
to help a future developer, reviewer, or investor understand the product without
reading the full codebase first.

## Product Areas

### Public Discovery

Primary files:

- `index.html`
- `js/main.js`
- `js/cards.js`
- `js/sidebar.js`
- `js/search-v2.js`
- `js/map.js`
- `js/modal.js`
- `css/start.css`
- `css/sidebar.css`
- `css/cards.css`
- `css/modal.css`

Purpose:

- Search and browse cigar stores and lounges.
- Navigate geography from continent to country, state, and city.
- View listing cards, modals, maps, comments, ratings, favorites, and reports.

### Add Listing

Primary files:

- `add-store.html`
- `js/add-store.js`
- `js/add-shared.js`
- `css/pages/add.css`

Purpose:

- Let visitors submit new stores or lounges.
- Route submissions into review rather than immediate publication.
- Support duplicate checks, type selection, place data, and photo handling.

### Member Account

Primary files:

- `account.html`
- `js/account.js`
- `css/account.css`

Purpose:

- Manage account details.
- Manage favorites and personal profile settings.
- Reserve future modules for sessions, contributor tools, and admin shortcuts.

### Backoffice

Primary files:

- `backoffice.html`
- `js/backoffice.js`
- `js/bo-reports.js`
- `css/backoffice.css`
- `css/bo-reports.css`

Purpose:

- Admin listing management.
- Pending listing approval and rejection.
- Store report handling.
- Comment moderation support.
- Operational review of flags, trash, and store quality.

### Analytics

Primary files:

- `analytics.html`
- `js/analytics.js`
- `js/analytics-pdf.js`
- `js/funnel-market-v2.js`
- `js/funnel-stores-v2.js`
- `js/funnel-users.js`
- `css/analytics.css`
- `css/analytics-pdf.css`

Purpose:

- Market intelligence by country and city.
- Store intelligence dossiers.
- Member activity analytics.
- PDF exports with WCL business presentation styling.

## Backend Authority

The frontend is not the source of truth for counts, approval, moderation, or
security decisions.

Canonical backend surfaces:

- `stores_frontend_public_v5`
- `search_stores_v2`
- `sidebar_nodes_v3`
- `stores_within_bounds`
- `analytics_top_stores_v2`

## Analytics Philosophy

WCL analytics is designed for discovery, trust, and business intelligence.

It is not an ad-tracking system and should not control listing visibility or
moderation automatically.

Core analytics areas:

- Member intelligence
- Store intelligence
- Market intelligence
- Traffic source analysis
- PDF reporting

Canonical events:

- `store_view`
- `store_opened`
- `website_clicked`

## Content Moderation

Comments are moderated before insert through the Supabase Edge Function
`moderate_comment_v1`.

The AI moderation layer should allow normal cigar discussion and block policy
violations such as illegal sales, sexual content, trafficking context,
off-platform promotion, spam, scams, political campaigning, and personal sales.

## Geography Rules

United States:

```text
continent -> country -> state -> city
```

All other countries:

```text
continent -> country -> city
```

## Documentation Entry Points

- `README.md` for product and repository overview.
- `SECURITY.md` for security model.
- `docs/README.md` for documentation index.
- `docs/owner-workflow.md` for owner-friendly GitHub and local workflow.
- `docs/backoffice-functional-test-checklist.md` for manual QA.
