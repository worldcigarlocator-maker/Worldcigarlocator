# World Cigar Locator

World Cigar Locator (WCL) is a global discovery platform for cigar stores,
lounges, hidden humidors, and premium cigar destinations.

The product combines a public search and map experience, member accounts,
community signals, owner-submitted listings, admin moderation, and analytics
for market and venue intelligence.

## Product Scope

- Public discovery website with search, maps, sidebar navigation, and listing cards.
- Authenticated member area for account settings, favorites, ratings, and comments.
- Public listing submission flow routed through review before publication.
- Admin Backoffice for listing approval, editing, rejection, reports, comments, and trash handling.
- Analytics workspace for market, store, member, and PDF reporting workflows.
- AI-assisted comment moderation through a Supabase Edge Function.

## Architecture

WCL is a static frontend backed by Supabase.

```text
Browser
  -> Static HTML, CSS, and JavaScript
  -> Supabase Auth, views, RLS policies, and RPCs
  -> Google Maps / Places browser APIs

Supabase
  -> PostgreSQL tables, views, triggers, and RLS
  -> Security-definer RPCs for controlled backend authority
  -> Edge Functions for AI moderation and server-side integrations

External Services
  -> Google Maps / Places / Photos
  -> OpenAI for policy-aware comment moderation
```

## Repository Map

```text
/
  index.html                 Public WCL experience
  account.html               Member account workspace
  analytics.html             Analytics and PDF reporting workspace
  backoffice.html            Admin Backoffice
  add-store.html             Public add-listing flow
  reports.html               Report and moderation views

  css/                       Page, component, and core styles
  js/                        Frontend runtime modules
  images/                    Brand, hero, icon, and content assets
  assets/                    SVG logos, flags, and shared visual assets
  locales/                   Localized static page content and language files
  supabase/functions/        Supabase Edge Function source
  docs/                      Launch, security, Supabase, and owner documentation
```

## Canonical Runtime Rules

These rules protect the product model and should be treated as non-negotiable:

- Backend authority overrides frontend behavior.
- The frontend must not aggregate authoritative counts.
- Sidebar counts are backend-only.
- Analytics are append-only.
- Human moderation overrides automation.
- No destructive database changes without owner approval.
- The public frontend must not use direct raw-store access for canonical listing data.

## Canonical Data Surfaces

Public listing and navigation flows should use the approved backend surfaces:

- `stores_frontend_public_v5`
- `search_stores_v2`
- `sidebar_nodes_v3`
- `stores_within_bounds`
- `analytics_top_stores_v2`

## Security Principles

- No service-role keys or private API keys in frontend code.
- Supabase RLS remains the first database safety layer.
- Admin writes are routed through authenticated checks and controlled RPCs.
- Browser API keys are domain-restricted and API-restricted.
- Public listing submissions go into review before becoming public.
- Public comments go through AI-assisted moderation before insert.
- Analytics events are append-only and must not influence listing approval or visibility.

See [SECURITY.md](SECURITY.md) for the security model.

## Development Workflow

The site can be previewed locally from the repository root:

```sh
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

For owner workflow, GitHub branch handling, and local review steps, see
[docs/owner-workflow.md](docs/owner-workflow.md).

## Documentation

Start with [docs/README.md](docs/README.md). It separates active operational
documentation from historical launch notes and SQL drafts.

Key documents:

- [docs/browser-key-restriction-guide.md](docs/browser-key-restriction-guide.md)
- [docs/ai-comment-moderation-guide.md](docs/ai-comment-moderation-guide.md)
- [docs/backoffice-functional-test-checklist.md](docs/backoffice-functional-test-checklist.md)
- [docs/my-account-future-modules.md](docs/my-account-future-modules.md)
- [project_map.md](project_map.md)

## Deployment Notes

- Frontend hosting is static.
- Supabase manages authentication, database policies, RPCs, and Edge Functions.
- Google browser keys must remain restricted to approved WCL domains.
- Supabase secrets must be configured in the Supabase dashboard or CLI, never committed.
- Production changes should be reviewed through a pull request before merging.

## Ownership

World Cigar Locator is a proprietary project. Code, brand assets, data model,
and documentation may not be copied, redistributed, or used commercially without
permission from the owner.
