# Browser Key Restriction Guide

Status: owner action required in Google Cloud.

## What Needs Restricting

WCL has two public Google Maps browser keys in the frontend.

### Public Map Key

Used by:

- `js/map.js`

Current purpose:

- Loads Google Maps JavaScript for the public map.
- Uses the marker library.

Recommended Google Cloud setup:

- Application restriction: Websites
- Website referrers:
  - `https://worldcigarlocator.com/*`
  - `https://www.worldcigarlocator.com/*`
- API restrictions:
  - Maps JavaScript API

Optional local/dev handling:

- Do not add localhost to the production key unless needed.
- If local map testing is needed, create a separate dev key and allow:
  - `http://localhost:4173/*`
  - `http://127.0.0.1:4173/*`

### Add Store / Places Key

Used by:

- `js/add-shared.js`
- `add-store.html`
- `add-store-backoffice.html`

Current purpose:

- Loads Google Maps JavaScript with `libraries=places`.
- Powers Places autocomplete and place lookup in add/edit listing flows.

Recommended Google Cloud setup:

- Application restriction: Websites
- Website referrers:
  - `https://worldcigarlocator.com/*`
  - `https://www.worldcigarlocator.com/*`
- API restrictions:
  - Maps JavaScript API
  - Places API

Optional local/dev handling:

- Prefer a separate dev key for localhost instead of allowing localhost on the production key.

## Supabase Browser Key

The Supabase anon/publishable key is different from a Google Maps billing key.

For Supabase:

- It is expected to be visible in browser code.
- It is not a secret like `service_role`.
- Real protection comes from RLS, grants, and RPC policies.
- WCL has already remediated the high-risk Supabase grant/RLS issues found during this launch audit.

Never put a Supabase `service_role` key or `sb_secret_...` key in frontend code.

## Owner Steps In Google Cloud

1. Open Google Cloud Console.
2. Go to Google Maps Platform > Credentials.
3. Open the public map key used by `js/map.js`.
4. Set Application restriction to Websites.
5. Add only the production referrers listed above.
6. Set API restrictions to Maps JavaScript API.
7. Save.
8. Open the add-store / Places key.
9. Set Application restriction to Websites.
10. Add only the production referrers listed above.
11. Set API restrictions to Maps JavaScript API and Places API.
12. Save.

## Verification After Saving

Test production after Google has had a few minutes to apply the restrictions:

- Homepage map loads.
- Map pins load.
- Add Store Google search/autocomplete works.
- Backoffice add/edit Google search/autocomplete works.

If a page fails:

- `RefererNotAllowedMapError` usually means the domain/referrer is missing from the key.
- `ApiTargetBlockedMapError` usually means the required API is missing from API restrictions.

## Official References

- Google Maps Platform security guidance:
  <https://developers.google.com/maps/api-security-best-practices>
- Google Places Library key restriction guidance:
  <https://developers.google.com/maps/documentation/javascript/legacy/places>
- Supabase API key guidance:
  <https://supabase.com/docs/guides/getting-started/api-keys>
