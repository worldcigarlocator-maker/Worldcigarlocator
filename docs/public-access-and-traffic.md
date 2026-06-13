# Public Access and Traffic Analytics

## Access Model

World Cigar Locator is publicly browsable after the legal-age confirmation.
Visitors do not need an account to:

- browse and search listings
- use the geography sidebar and map
- open listing details
- read comments and ratings
- visit listing websites or request directions
- report inaccurate listing information

An authenticated account is required to:

- save favorites
- submit ratings
- post comments or replies
- submit a new listing
- access account and administrative features

Backend authorization and row-level security remain authoritative. Frontend
prompts improve the experience but are not treated as security controls.

## Privacy-Safe Aggregate Traffic

WCL records the following append-only aggregate events without requiring
enhanced analytics consent:

- `site_opened`
- `store_view`
- `store_opened`
- `website_clicked`
- `directions_clicked`
- `search_used`

The public aggregate logger does not accept or store:

- visitor IDs
- session IDs
- account IDs or email addresses
- IP-derived user geography
- free-text search queries

These event counts describe activity, not exact unique people. In particular,
`site_opened` is displayed as **Page loads**, never as exact unique visitors.

## Optional Enhanced Analytics

Enhanced analytics remains consent-based. It may add session continuity,
approximate journeys, search details, map usage, and geography as described in
the Privacy Policy and cookie settings.

## Backend Contracts

- `log_public_activity_v1` appends whitelisted privacy-safe events.
- `analytics_traffic_overview_v1` returns admin-only traffic totals.
- Browser roles do not receive direct read access to `analytics_events`.
- Analytics never influences rendering, listing approval, or moderation.
