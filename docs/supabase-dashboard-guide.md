# Supabase Dashboard Guide For WCL

This guide is for the project owner. It avoids coding terms as much as possible.

## Goal

We need one read-only report from Supabase so Codex can check whether the database protects WCL correctly.

This is not a password or secret-key step. Do not paste service-role keys into chat.

## What You Will Do

You will open Supabase, paste one ready-made read-only query, click Run, and send the result back to Codex.

## Step By Step

1. Go to <https://supabase.com/dashboard>

2. Open the WCL project.

3. In the left menu, click **SQL Editor**.

4. Click **New query**.

5. Open this file in GitHub or VS Code:

   ```text
   docs/supabase-readonly-launch-audit.sql
   ```

6. Copy the whole file.

7. Paste it into the Supabase SQL Editor.

8. Click **Run**.

9. Supabase should show one result column called:

   ```text
   wcl_launch_audit_json
   ```

10. Copy the result text and give it to Codex.

If the result is too large to paste in chat, download/export the result and upload the file instead.

## Important

The query starts with comments saying it is read-only. It only uses `SELECT`.

Do not run any query that contains:

- `insert`
- `update`
- `delete`
- `drop`
- `truncate`
- `alter`
- `create policy`

The WCL launch audit query does not need any of those.

## What Codex Will Check

Codex will use the output to verify:

- Public visitors can only see approved public data.
- Backoffice write actions require real admin authority.
- Admin RPCs check who is calling them.
- Analytics remains append-only.
- Public submit/add-store cannot silently approve stores.
