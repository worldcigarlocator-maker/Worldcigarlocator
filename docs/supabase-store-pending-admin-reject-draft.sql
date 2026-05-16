-- WCL Supabase Store Pending Admin Reject Follow-Up
-- Date: 2026-05-16
--
-- Status:
--   Draft for owner review.
--
-- Why this exists:
--   Backoffice pending submissions live in store_pending and have their own ID
--   sequence. They must never be treated as real stores rows.
--   The frontend now uses a separate "Reject Pending" action for pending rows.
--
-- What this does:
--   - Keeps public visitors able to submit pending listings.
--   - Keeps pending reads limited to authenticated admins.
--   - Lets authenticated admins delete/reject rows from store_pending.
--
-- What this does not do:
--   - It does not delete existing pending rows when the script is run.
--   - It does not touch the stores table.
--   - It does not approve, reject, or mutate any store row.

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
    raise exception 'bo_is_admin_v1 must exist and be SECURITY DEFINER before updating store_pending policies';
  end if;
end
$$;

alter table public.store_pending enable row level security;

-- Public visitors can submit. Admins can read and reject. RLS does row authority.
revoke select, update, delete, truncate on table public.store_pending from anon;
revoke update, truncate on table public.store_pending from authenticated;

grant insert on table public.store_pending to anon, authenticated;
grant select, delete on table public.store_pending to authenticated;

drop policy if exists store_pending_admin_delete on public.store_pending;

create policy store_pending_admin_delete
on public.store_pending
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
  and tablename = 'store_pending'
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
  and g.table_name = 'store_pending'
  and g.grantee in ('anon', 'authenticated', 'public')
  and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
order by g.grantee, g.privilege_type;
