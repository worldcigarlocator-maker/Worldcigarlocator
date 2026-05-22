# WCL Owner Workflow

This is the simple working model for Codex, GitHub, VS Code, and local preview.

## Mental Model

- GitHub is the source of truth.
- Codex works in a branch, not directly on production.
- VS Code is your fast way to inspect files and changes.
- Local preview is only for checking the site on your machine.

## Current Codex Branch

- Base branch: `Main-1`
- Working branch: `codex-launch-readiness`

Codex pushes work to `codex-launch-readiness`. Nothing is merged into `Main-1` unless you approve it through GitHub.

## Local Folder

Open this folder in VS Code:

```text
/Users/andreasbagler/Documents/Codex/2026-05-15/jag-har-ett-stort-projekt-som/Worldcigarlocator
```

## Local Preview

The static site can be served from the repository root:

```sh
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173
```

If the page looks stale, reload the browser tab. Code changes are in files immediately; no private window should be needed for normal review.

## How To Review Codex Work

In VS Code:

1. Open Source Control.
2. Check changed files.
3. Open `docs/launch-readiness-audit.md` for the current work summary.
4. Open `docs/frontend-runtime-map.md` to understand which files power each page.
5. Open `docs/supabase-contract-needed.md` when checking database/backend work.

In GitHub:

1. Open the branch `codex-launch-readiness`.
2. Create or review a pull request into `Main-1`.
3. Merge only after checks and manual review are okay.

## Safety Rules

- Do not paste service-role keys into chat.
- Do not commit `.env` files.
- Do not delete old files until imports and runtime behavior are verified.
- Do not merge launch work into `Main-1` until you are comfortable with the preview and checklist.
