-- WCL Supabase wcl_admins Follow-Up Fix Draft
-- Date: 2026-05-15
--
-- Status:
--   Draft for owner review.
--
-- Why this exists:
--   Post-fix table verification showed public/authenticated direct access
--   still exists on public.wcl_admins while RLS is disabled.
--
-- What this does:
--   - Replaces the direct stores insert policy check against public.wcl_admins
--     with the SECURITY DEFINER admin function public.bo_is_admin_v1().
--   - Removes direct anon/authenticated access from public.wcl_admins.
--
-- What this does not do:
--   - It does not delete data.
--   - It does not drop tables.
--   - It does not change existing admin rows.

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
    raise exception 'bo_is_admin_v1 must exist and be SECURITY DEFINER before locking wcl_admins';
  end if;
end
$$;

drop policy if exists bo_insert_stores_admin_only on public.stores;

create policy bo_insert_stores_admin_only
on public.stores
for insert
to authenticated
with check (public.bo_is_admin_v1(auth.uid()));

revoke all privileges on table public.wcl_admins from anon, authenticated;

commit;

-- Verification query:
-- Expected:
--   - no rows for wcl_admins
--   - stores may still show grants, but RLS must be true
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
  and g.grantee in ('anon', 'authenticated', 'public')
  and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  and t.table_type = 'BASE TABLE'
  and g.table_name in ('wcl_admins', 'stores')
order by g.table_name, g.grantee, g.privilege_type;
