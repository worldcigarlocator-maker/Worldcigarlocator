-- WCL Supabase Stores Policy Follow-Up
-- Date: 2026-05-16
--
-- Status:
--   Draft for owner review.
--
-- Why this exists:
--   Final policy verification showed stores_authenticated_read = true for all
--   authenticated users, and no explicit admin UPDATE policy on stores.
--
-- What this does:
--   - Keeps anonymous visitors limited to approved, non-deleted stores.
--   - Limits normal authenticated users to approved, non-deleted stores.
--   - Lets admins read all stores through bo_is_admin_v1().
--   - Lets admins update stores for backoffice edit/unflag/trash/photo repair.
--   - Removes direct anon insert/update/delete grants on stores.
--
-- What this does not do:
--   - It does not delete data.
--   - It does not drop tables.
--   - It does not change store rows.

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
    raise exception 'bo_is_admin_v1 must exist and be SECURITY DEFINER before updating stores policies';
  end if;
end
$$;

-- Keep the public API grants narrow. RLS policies do the row-level authority.
revoke insert, update, delete, truncate on table public.stores from anon;
revoke delete, truncate on table public.stores from authenticated;

grant select on table public.stores to anon, authenticated;
grant insert, update on table public.stores to authenticated;

-- Replace broad authenticated read with public-read-or-admin-read.
drop policy if exists stores_authenticated_read on public.stores;

create policy stores_authenticated_read
on public.stores
for select
to authenticated
using (
  ((approved = true) and (deleted = false))
  or public.bo_is_admin_v1(auth.uid())
);

-- Explicit admin update path for current backoffice direct update flows.
drop policy if exists stores_admin_update on public.stores;

create policy stores_admin_update
on public.stores
for update
to authenticated
using (public.bo_is_admin_v1(auth.uid()))
with check (public.bo_is_admin_v1(auth.uid()));

commit;

-- Verification query:
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
  and tablename = 'stores'
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
  and g.table_name = 'stores'
  and g.grantee in ('anon', 'authenticated', 'public')
  and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
order by g.grantee, g.privilege_type;
