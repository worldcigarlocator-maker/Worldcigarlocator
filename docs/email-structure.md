# WCL Email Structure

This document describes the intended email setup for World Cigar Locator.

## Email Goals

- Make account and support communication feel premium and trustworthy.
- Keep all API keys out of frontend code.
- Route transactional emails through Supabase Edge Functions.
- Keep inbound addresses simple and professional.
- Avoid sending emails silently from the browser without backend control.

## Address Model

Recommended public addresses:

- `info@worldcigarlocator.com` - general contact and business inquiries.
- `support@worldcigarlocator.com` - product support and user help.
- `account@worldcigarlocator.com` - account/login-related help.
- `report-store@worldcigarlocator.com` - listing accuracy and business report fallback.
- `notifications@worldcigarlocator.com` - outbound automated emails. This should not be used as a public contact address.

The custom addresses shown in Resend are inbound addresses/forwarding rules.
They receive mail and route it to a destination inbox. They do not by themselves
send app autoresponders.

## Outbound Email Flow

Transactional app emails use:

```text
frontend action
  -> Supabase Edge Function send_wcl_email_v1
  -> Resend API
  -> recipient inbox
```

The frontend never stores or sees the Resend API key.

## Active App Emails

Implemented through `supabase/functions/send_wcl_email_v1`:

| Trigger | Recipient | Purpose |
| --- | --- | --- |
| `listing_submitted` | signed-in user's email | Confirms that WCL received an add-listing submission. |
| `report_received` | signed-in user's email | Confirms that WCL received a listing report. |
| `support_received` | signed-in user's email | Template reserved for future support forms. |
| `account_received` | signed-in user's email | Template reserved for future account support forms. |

If `WCL_ADMIN_EMAIL` is configured, WCL also receives an admin copy for:

- `listing_submitted`
- `report_received`

## Required Supabase Secrets

Set these in Supabase before deploying or testing outbound mail:

```text
RESEND_API_KEY
WCL_EMAIL_FROM
WCL_EMAIL_REPLY_TO
WCL_ADMIN_EMAIL
WCL_SITE_URL
```

Recommended values:

```text
WCL_EMAIL_FROM=World Cigar Locator <notifications@worldcigarlocator.com>
WCL_EMAIL_REPLY_TO=support@worldcigarlocator.com
WCL_SITE_URL=https://worldcigarlocator.com
```

`WCL_ADMIN_EMAIL` should be the owner/admin inbox that should receive internal
copies of important submissions.

## Deploy Command

From the repository root:

```sh
supabase functions deploy send_wcl_email_v1
```

## Supabase Auth Emails

Supabase Auth controls these emails separately from the WCL Edge Function:

- Confirm signup
- Reset password
- Change email

These should be styled in Supabase Auth email templates and sent through the
same verified sender domain where possible.

## Auth Template Copy

### Confirm Signup

Subject:

```text
Confirm your World Cigar Locator account
```

Body:

```html
<h2>Welcome to World Cigar Locator</h2>
<p>Confirm your email address to activate your WCL account.</p>
<p>After confirmation, you can save favorites, leave ratings, comment, and help keep listings accurate.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm my account</a></p>
<p>If you did not create this account, you can ignore this email.</p>
```

### Reset Password

Subject:

```text
Reset your World Cigar Locator password
```

Body:

```html
<h2>Reset your WCL password</h2>
<p>Use the secure link below to set a new password for your World Cigar Locator account.</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>If you did not request this, you can ignore this email.</p>
```

### Change Email

Subject:

```text
Confirm your new World Cigar Locator email
```

Body:

```html
<h2>Confirm your new email address</h2>
<p>Use the secure link below to confirm the email change for your WCL account.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email change</a></p>
<p>If you did not request this change, contact WCL support.</p>
```

## Testing Checklist

1. Confirm domain verification in Resend.
2. Confirm `notifications@worldcigarlocator.com` is allowed as a sender.
3. Add Supabase secrets.
4. Deploy `send_wcl_email_v1`.
5. Sign in to WCL.
6. Submit a test listing and confirm:
   - listing is saved to pending review.
   - user receives `WCL: Listing submission received`.
   - admin receives an admin copy if `WCL_ADMIN_EMAIL` is set.
7. Submit a test listing report and confirm:
   - report appears in Backoffice.
   - user receives `WCL: Listing report received`.
   - admin receives an admin copy if configured.
8. Test Supabase Auth signup confirmation and reset password templates.

## Safety Notes

- Do not put `RESEND_API_KEY` in frontend code.
- Do not make email delivery block listing/report submission UX.
- Do not send admin-only data to public users.
- Keep autoresponder text factual. Do not promise approval, correction, or a response time.
- Reports must remain manual review only.
