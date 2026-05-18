# WCL AI Comment Moderation

## Goal

Blacklist terms should act as a warning signal, not as a blind judge.
AI moderation must apply the same WCL policy across all languages.

The flow is:

1. User posts a comment.
2. Supabase Edge Function `moderate_comment_v1` receives the comment.
3. Backend checks `keywords_blacklist` / `keywords_whitelist` as an extra signal.
4. OpenAI reviews the full context in any language.
5. AI returns `safe` or `block`.
6. Only `safe` comments are inserted.

There is no browser fallback to the old direct comment RPC. If the Edge Function
is unavailable, the comment is not posted.

The trusted insert RPC is service-role only, and direct browser INSERT access to
`store_comments` is removed.

## What AI Should Allow

Normal cigar discussion is allowed:

- cheap cigars
- Cohiba
- Cubans
- vintage cigars
- store sells cigars
- good value
- lounge recommendations
- harmless emojis such as thumbs up, stars, fire, flags, and smileys
- equivalent normal cigar discussion in any supported language

## What AI Should Block

The AI classifier blocks:

- illegal drug sales
- sexual services or pornography
- exploitation, trafficking, or sexual minors context
- requests looking for young girls, young boys, children, minors, or underage people
- social media promotion
- off-platform contact
- personal cigar/product sales
- payment handles
- spam/scam links
- political campaigning
- emojis used to imply blocked content
- equivalent policy violations in any language

## Required Supabase Secrets

Set these in Supabase:

```text
OPENAI_API_KEY
OPENAI_COMMENT_MODERATION_MODEL
```

`OPENAI_COMMENT_MODERATION_MODEL` is optional. If it is not set, the function
uses `gpt-4o-mini`.

Supabase already provides these to Edge Functions:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Deploy Order

1. Run `docs/supabase-content-policy-moderation-draft.sql`.
2. Run `docs/supabase-ai-comment-moderation-draft.sql`.
3. Deploy `supabase/functions/moderate_comment_v1`.
4. Add a test blacklist term such as `wclblocktest`.
5. Verify:
   - `Nice lounge` posts.
   - `Great lounge 👍🏾` posts.
   - `They sell lots of Cubans here` posts.
   - `DM me on Telegram to buy cigars` blocks.
   - `Looking for young girl` blocks.
   - `wclblocktest` blocks unless the AI classifies the full context as safe.
6. Remove the test blacklist term.

## Deploy Command

From a Supabase-connected project:

```sh
supabase functions deploy moderate_comment_v1
```

Then set secrets:

```sh
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_COMMENT_MODERATION_MODEL=gpt-4o-mini
```
