# WCL Documentation Index

This folder contains active documentation, launch work notes, Supabase SQL
drafts, and owner review material for World Cigar Locator.

For a first read, start here:

- [../README.md](../README.md) - product and repository overview.
- [../SECURITY.md](../SECURITY.md) - security model.
- [../project_map.md](../project_map.md) - application map and runtime ownership.
- [owner-workflow.md](owner-workflow.md) - owner-friendly GitHub, Codex, and local preview workflow.

## Active Operational Documents

- [browser-key-restriction-guide.md](browser-key-restriction-guide.md) - Google browser key restrictions.
- [ai-comment-moderation-guide.md](ai-comment-moderation-guide.md) - AI-assisted comment moderation.
- [email-structure.md](email-structure.md) - Resend, Supabase Auth, and WCL transactional email structure.
- [backoffice-functional-test-checklist.md](backoffice-functional-test-checklist.md) - Backoffice smoke test checklist.
- [my-account-future-modules.md](my-account-future-modules.md) - future account modules that are intentionally documented but not active.
- [frontend-runtime-map.md](frontend-runtime-map.md) - frontend file ownership and runtime responsibilities.

## Launch and Review History

These files are useful context for what changed during launch readiness work.
They are not the canonical product overview.

- [launch-readiness-audit.md](launch-readiness-audit.md)
- [pr-summary.md](pr-summary.md)
- [supabase-owner-results.md](supabase-owner-results.md)
- [backoffice-admin-audit.md](backoffice-admin-audit.md)
- [supabase-contract-needed.md](supabase-contract-needed.md)
- [supabase-security-remediation-plan.md](supabase-security-remediation-plan.md)

## SQL Drafts and Applied Fix Notes

SQL files in this folder are review artifacts. Do not run any SQL draft blindly
in production. Always confirm that the current Supabase state still matches the
draft and that a backup exists.

Important SQL history:

- `supabase-security-fix-draft.sql`
- `supabase-wcl-admins-fix-draft.sql`
- `supabase-stores-policy-follow-up.sql`
- `supabase-store-comments-admin-fix-draft.sql`
- `supabase-store-pending-admin-reject-draft.sql`
- `supabase-analytics-admin-rpc-fix-draft.sql`
- `supabase-content-policy-moderation-draft.sql`
- `supabase-ai-comment-moderation-draft.sql`

## Documentation Rule

When launch work is complete, this folder should remain as the handover source.
Old working notes may stay for traceability, but the top-level README,
SECURITY.md, project map, and this index should be treated as the professional
entry points.
