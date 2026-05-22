# Store Report Spam Filter Requirements

This note documents the launch requirement for the public listing report flow.

## Current Frontend Guard

The public report UI now includes a light client-side guard:

- hidden honeypot field
- minimum time before submit
- duplicate report cooldown for the same browser
- hourly report limit for the same browser
- one in-flight submit at a time

This helps with accidental repeats and simple bots, but it is not a security boundary.

## Required Server-Side Guard

The Supabase Edge Function `submit_store_report_v1` should enforce the real spam filter before inserting into `store_reports`.

Minimum checks:

- validate `store_id` is a real store
- only accept known report types:
  - `no_longer_sells`
  - `no_smoking_allowed`
  - `membership_policy_wrong`
  - `wrong_address`
  - `permanently_closed`
  - `duplicate`
  - `other`
- trim and cap the optional message length
- block or throttle repeated reports from the same IP/user/session
- block duplicate reports for the same store and report type within a short window
- never update, delete, approve, reject, or hide a store from a public report
- always leave final action to human backoffice moderation

## Open Item

The Edge Function source is not present in this repository, so the frontend can send safe-shaped data, but the real spam filter must be verified or implemented in Supabase before launch.
