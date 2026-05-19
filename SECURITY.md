# World Cigar Locator Security Model

Last updated: 2026-05-19

This document describes the current security model for World Cigar Locator
(WCL). It is written for owner review, external technical review, and future
handover.

## Security Objectives

- Keep private API keys and service-role credentials out of the browser.
- Expose only approved public listing data to anonymous visitors.
- Route sensitive writes through Supabase Auth, RLS, and controlled RPCs.
- Keep analytics append-only and separate from listing moderation.
- Allow human moderation to override automation.
- Block unsafe community comments before they are written to the database.
- Keep Google browser keys restricted by domain and API scope.

## Public Frontend Boundary

The public frontend may read approved public listing surfaces and call approved
RPCs only.

Canonical public data surfaces include:

- `stores_frontend_public_v5`
- `search_stores_v2`
- `sidebar_nodes_v3`
- `stores_within_bounds`

The public frontend must not use service-role credentials or unrestricted
database access.

## Supabase Auth and Admin Checks

Admin behavior is controlled through Supabase Auth and server-side admin checks.

Important backend functions:

- `bo_is_admin_v1`
- `approve_store_pending`
- `bo_moderate_store_report_v1`

Admin-only workflows must verify the signed-in user server-side before changing
listings, pending submissions, reports, comments, or moderation state.

## Row Level Security

RLS is part of the active safety model for key user-facing tables.

Important protected areas include:

- `stores`
- `store_pending`
- `store_comments`
- `store_reports`
- `store_report_actions`
- `store_favorites`
- `profiles`

Public users may read approved public listing data. Authenticated users may use
member features. Admin users may access moderation and backoffice flows through
admin policies or controlled RPCs.

## Listing Submission Model

Public add-listing submissions go into `store_pending`. They are not published
directly.

Approval is performed through an admin-controlled path. The approval function
must check admin authority before moving a pending listing into the public
listing table.

## Comment Moderation Model

Public comments are routed through the Supabase Edge Function
`moderate_comment_v1`.

The moderation flow is:

1. The browser submits the comment to the Edge Function.
2. The function checks the WCL policy context.
3. The function uses OpenAI for language-aware classification.
4. Safe comments are inserted through the trusted backend path.
5. Blocked comments are not written to `store_comments`.

The old direct browser insert path for comments should remain closed.

## Analytics Model

Analytics events are append-only. They may be used for reporting and market
insight, but they must not decide moderation, approval, deletion, ranking, or
store visibility by themselves.

Canonical public event types:

- `store_view`
- `store_opened`
- `website_clicked`

Additional internal event types may exist for analytics workflows, but they
should remain controlled and documented.

## API Keys and Secrets

Secrets must be stored in Supabase or the relevant hosting provider, never in
frontend code or committed files.

Important secret names:

- `OPENAI_API_KEY`
- `OPENAI_COMMENT_MODERATION_MODEL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Google server-side API keys used by backend functions

Browser keys must be restricted in Google Cloud:

- Application restriction: approved WCL domains only.
- API restriction: only APIs required by the browser.

See [docs/browser-key-restriction-guide.md](docs/browser-key-restriction-guide.md).

## Backoffice Safety

Backoffice is an admin workspace. It may show broader operational data than the
public frontend, but writes must still be authorized server-side.

Backoffice permissions should support:

- Listing approval, edit, reject, restore, and soft delete.
- Comment moderation and admin deletion.
- Report review and status changes.
- Pending listing review.
- Read-only analytics where appropriate.

## Operational Verification

Before launch or handover, verify:

- Anonymous users can only see approved public listings.
- Anonymous users can submit pending listings but cannot read the pending queue.
- Anonymous users cannot write directly to `store_comments`.
- Authenticated non-admin users cannot approve or edit public listings.
- Admin users can use Backoffice workflows.
- Comment moderation blocks unsafe content and allows normal cigar discussion.
- Browser keys reject unapproved origins.
- No service-role key is present in frontend files.

Detailed launch notes and SQL history live in [docs/README.md](docs/README.md).
