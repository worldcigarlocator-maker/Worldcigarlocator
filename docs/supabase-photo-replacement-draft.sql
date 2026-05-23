-- WCL Supabase Photo Replacement Draft
-- Date: 2026-05-22
--
-- Purpose:
--   Adds a WCL-controlled image URL field so selected listings can stop using
--   Google Places photos over time.
--
-- Important:
--   This does not copy, download, or rehost Google photos.
--   Only use photo_url for images WCL is allowed to use.
--
-- Safe scope:
--   - Adds one nullable column to public.stores.
--   - Adds an HTTPS-only check for future values.
--   - Does not delete data.
--   - Does not change approval, moderation, or analytics logic.
--
-- Run only after a Supabase backup exists.

begin;

set local lock_timeout = '5s';

alter table public.stores
  add column if not exists photo_url text;

comment on column public.stores.photo_url is
  'WCL-controlled replacement image URL. Must not contain copied Google Places photo URLs unless licensed/approved separately.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stores_photo_url_https_check'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_photo_url_https_check
      check (
        photo_url is null
        or photo_url ~* '^https://[^[:space:]]+$'
      );
  end if;
end
$$;

commit;

-- Verification:
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'stores'
  and column_name = 'photo_url';

-- Follow-up before public frontend can use photo_url:
--   1. Update public.stores_frontend_public_v5 so it includes photo_url.
--   2. Update public.search_stores_v2 so it returns photo_url.
--   3. Update public.stores_within_bounds if map/card results rely on that RPC.
--
-- Do not recreate these views/functions from memory. First inspect current
-- definitions, then patch only the selected output fields:
--
-- select pg_get_viewdef('public.stores_frontend_public_v5'::regclass, true);
--
-- select
--   p.proname,
--   pg_get_functiondef(p.oid)
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('search_stores_v2', 'stores_within_bounds');
