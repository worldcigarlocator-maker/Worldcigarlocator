# WCL AI Comment Moderation

## Goal

Blacklist terms should act as a warning signal, not as a blind judge.
AI moderation must apply the same WCL policy across all languages.

The flow is:

1. User posts a comment.
2. Supabase Edge Function `moderate_comment_v1` receives the comment.
3. Backend checks `keywords_blacklist` / `keywords_whitelist`.
4. If there is no policy hit, the comment is posted.
5. If there is a policy hit, OpenAI reviews the context.
6. AI returns `safe` or `block`.
7. Only `safe` comments are inserted.

## What AI Should Allow

Normal cigar discussion is allowed:

- cheap cigars
- Cohiba
- Cubans
- vintage cigars
- store sells cigars
- good value
- lounge recommendations
- equivalent normal cigar discussion in any supported language

## What AI Should Block

The AI classifier blocks:

- illegal drug sales
- sexual services or pornography
- exploitation, trafficking, or sexual minors context
- social media promotion
- off-platform contact
- personal cigar/product sales
- payment handles
- spam/scam links
- political campaigning
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
   - `They sell lots of Cubans here` posts.
   - `DM me on Telegram to buy cigars` blocks.
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
