# WCL Bot Protection

WCL uses bot protection only where it creates the most value without making the product annoying.

## Launch Scope

- Create Account: Cloudflare Turnstile through Supabase Auth CAPTCHA.
- Login: no CAPTCHA at launch.
- Add Listing: duplicate blocking plus human backoffice review.
- Report Listing: browser-side cooldown guard plus Supabase Edge Function submission path.

## Supabase Setup

1. Create a Cloudflare Turnstile site.
2. Copy the public site key into `TURNSTILE_SITE_KEY` in `js/globals.js`.
3. Keep the Turnstile secret key out of GitHub.
4. In Supabase Dashboard, go to Authentication settings and enable CAPTCHA protection.
5. Select Cloudflare Turnstile and paste the secret key.

The frontend sends the Turnstile token through `supabase.auth.signUp` as `options.captchaToken`.
