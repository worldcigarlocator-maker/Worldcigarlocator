# WCL Cookie Consent

## Purpose

World Cigar Locator separates required site storage, privacy-safe aggregate
analytics, and optional enhanced analytics.

Required storage covers:

- login and account access
- legal-age confirmation
- language preference
- security and anti-abuse state
- core listing, map, report and moderation workflows

Privacy-safe aggregate analytics runs without analytics cookies, visitor IDs,
session IDs, account IDs, email addresses, user geography, or IP-derived user
location stored by WCL. It covers:

- page loads
- listing impressions and store opens
- website and directions click events
- search-use counts without free-text search queries

Optional enhanced analytics covers:

- session start events
- visitor/session continuity
- signed-in member context where available
- search and map usage events
- user geography for analytics

## Runtime Keys

Consent is stored in:

- `wcl_cookie_consent_v1`

Allowed values:

- `accepted`
- `rejected`

Enhanced analytics is only sent when the value is `accepted`.
Basic aggregate listing analytics can still be sent when the value is
`rejected`, but without visitor/session/account identifiers.

Basic aggregate analytics measures events, not unique people. For example,
`page loads` is an exact count of page loads and must not be presented as an
exact count of unique visitors.

If enhanced analytics is rejected or withdrawn, the frontend removes analytics
visitor, session and view-dedupe identifiers from local storage/session storage.

## User Controls

The homepage cookie banner provides:

- `Accept enhanced`
- `Reject enhanced`
- `Manage`
- `Save settings`

The sidebar footer includes `Cookie Settings` so users can reopen the settings
and change their choice.

## Notes

This is a launch-safe consent layer, not a full consent management platform.
If WCL later adds advertising, paid placement, or third-party marketing pixels,
the consent model must be reviewed before launch.
