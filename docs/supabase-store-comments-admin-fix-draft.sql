-- WCL Supabase Store Comments Admin Follow-Up
-- Date: 2026-05-16
--
-- Status:
--   Draft for owner review.
--
-- Why this exists:
--   Backoffice edit modal includes an admin "delete comment" action.
--   Current owner-provided policies showed users can delete their own comments,
--   but no explicit admin delete policy for store_comments.
--
-- What this does:
--   - Keeps public comment reads available.
--   - Keeps authenticated users able to insert their own comments.
--   - Keeps users able to delete their own comments.
--   - Adds an explicit admin delete policy through bo_is_admin_v1().
--   - Removes unnecessary anon write/truncate grants on store_comments.
--
-- What this does not do:
--   - It does not delete existing comments.
--   - It does not drop tables.
--   - It does not approve, reject, or mutate store rows.

begin;

set local lock_timeout = '5s';

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'bo_is_admin_v1'
      and p.prosecdef = true
  ) then
    raise exception 'bo_is_admin_v1 must exist and be SECURITY DEFINER before updating store_comments policies';
  end if;
end
$$;

alter table public.store_comments enable row level security;

-- Keep the public API grants narrow. RLS policies do the row-level authority.
revoke insert, update, delete, truncate on table public.store_comments from anon;
revoke update, truncate on table public.store_comments from authenticated;

grant select on table public.store_comments to anon, authenticated;
grant insert, delete on table public.store_comments to authenticated;

drop policy if exists store_comments_admin_delete on public.store_comments;

create policy store_comments_admin_delete
on public.store_comments
for delete
to authenticated
using (public.bo_is_admin_v1(auth.uid()));

commit;

-- Verification queries:
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'store_comments'
order by policyname;

select
  g.grantee,
  g.table_name,
  g.privilege_type,
  c.relrowsecurity as rls_enabled
from information_schema.role_table_grants g
join information_schema.tables t
  on t.table_schema = g.table_schema
 and t.table_name = g.table_name
left join pg_namespace n
  on n.nspname = g.table_schema
left join pg_class c
  on c.relname = g.table_name
 and c.relnamespace = n.oid
where g.table_schema = 'public'
  and g.table_name = 'store_comments'
  and g.grantee in ('anon', 'authenticated', 'public')
  and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
order by g.grantee, g.privilege_type;
