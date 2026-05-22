# Google Maps / Places Content Compliance

## Purpose

World Cigar Locator uses Google Maps Platform for map display, place lookup,
place identifiers, and selected listing photos.

This document exists so future WCL work does not accidentally treat Google
content as WCL-owned content.

## Current WCL Usage

- Google Maps JavaScript API powers the public map.
- Google Places powers add/edit listing lookup.
- Store records may include `place_id`.
- Store records may include a selected `photo_reference`.
- Photos displayed from `photo_reference` are shown with a visible `Google Maps`
  attribution label in cards and the listing modal.

## Rules

- Do not claim ownership of Google Maps, Google Places, or Google-provided photos.
- Do not sell, sublicense, or redistribute Google-provided content as WCL content.
- Keep Google API keys restricted to approved WCL domains and required APIs.
- Display Google attribution when Google-provided photos or place content is shown.
- Treat Google photo references as temporary service references, not permanent
  WCL-owned media assets.
- Prefer `place_id` as the durable Google identifier. Google identifies place IDs
  as an allowed stored identifier; broader Places content and photo references
  should not be treated as long-term cached content.

## Public Disclosures

WCL discloses Google Maps / Places usage in:

- About
- Legal
- Privacy Policy
- visible photo attribution labels on Google-sourced listing images

## Future Cleanup

The current database may contain legacy `photo_reference` values. Before scaling
the image system, WCL should consider refreshing photos from `place_id` on demand
or replacing Google-sourced listing photos with properly licensed, owner-submitted,
or WCL-owned images.

## References

- Google Maps Platform Terms: https://cloud.google.com/maps-platform/terms
- Google Maps Platform Places API Policies: https://developers.google.com/maps/documentation/places/web-service/policies
- Google Places Photos: https://developers.google.com/maps/documentation/places/web-service/place-photos
