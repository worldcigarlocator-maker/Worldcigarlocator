# WCL Cookie Consent

## Purpose

World Cigar Locator separates required site storage from optional analytics.

Required storage covers:

- login and account access
- legal-age confirmation
- language preference
- security and anti-abuse state
- core listing, map, report and moderation workflows

Optional analytics covers:

- session start events
- listing views and opens
- website click events
- search and map usage events

## Runtime Keys

Consent is stored in:

- `wcl_cookie_consent_v1`

Allowed values:

- `accepted`
- `rejected`

Analytics is only sent when the value is `accepted`.

If analytics is rejected or withdrawn, the frontend removes analytics visitor,
session and view-dedupe identifiers from local storage/session storage.

## User Controls

The homepage cookie banner provides:

- `Accept analytics`
- `Reject analytics`
- `Manage`
- `Save settings`

The sidebar footer includes `Cookie Settings` so users can reopen the settings
and change their choice.

## Notes

This is a launch-safe consent layer, not a full consent management platform.
If WCL later adds advertising, paid placement, or third-party marketing pixels,
the consent model must be reviewed before launch.
