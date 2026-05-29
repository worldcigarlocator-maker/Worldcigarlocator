-- WCL Supabase Public Store Photo URLs RPC
-- Date: 2026-05-29
--
-- Purpose:
--   Lets the public frontend hydrate already-loaded store rows with WCL
--   replacement images from public.stores.photo_url.
--
-- Safe scope:
--   - Returns only id + photo_url.
--   - Returns only approved, non-deleted public listings.
--   - Does not expose pending, flagged-only admin data, moderation fields, or
--     private user data.
--
-- Important:
--   This does not copy, download, or rehost Google Places photos.
--   It only exposes WCL-controlled image URLs that have already been approved.

create or replace function public.store_photo_urls_v1(
  p_store_ids bigint[]
)
returns table (
  id bigint,
  photo_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.photo_url
  from public.stores s
  where s.id = any(coalesce(p_store_ids, array[]::bigint[]))
    and s.approved = true
    and s.deleted = false
    and nullif(trim(s.photo_url), '') is not null;
$$;

revoke all privileges on function public.store_photo_urls_v1(bigint[]) from public;
grant execute on function public.store_photo_urls_v1(bigint[]) to anon, authenticated;

-- Verification 1: function execute grants.
select
  routine_name as function_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'store_photo_urls_v1'
  and grantee in ('anon', 'authenticated', 'PUBLIC', 'public')
order by grantee;

-- Verification 2: sample call. Replace 7099 with a store id that has photo_url.
select *
from public.store_photo_urls_v1(array[7099]::bigint[]);
