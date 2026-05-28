-- WCL Supabase Store Photo Upload Storage
-- Date: 2026-05-28
--
-- Purpose:
--   Enables admin-only uploads of WCL/venue-approved listing images from the
--   Backoffice Photos tab.
--
-- What this does:
--   - Ensures public.stores.photo_url exists.
--   - Creates/updates a public Supabase Storage bucket named store-photos.
--   - Allows public read access to images in that bucket.
--   - Allows only authenticated WCL admins to upload, update, or delete images.
--
-- What this does not do:
--   - It does not copy, download, or rehost Google Places photos.
--   - It does not delete store data.
--   - It does not expose store moderation/admin data.
--
-- Important:
--   Only upload images WCL has permission to use.
--   Run only after a Supabase backup exists.

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
    raise exception 'bo_is_admin_v1 must exist and be SECURITY DEFINER before running this fix';
  end if;
end
$$;

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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'store-photos',
  'store-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists store_photos_public_read on storage.objects;
create policy store_photos_public_read
on storage.objects
for select
to public
using (bucket_id = 'store-photos');

drop policy if exists store_photos_admin_insert on storage.objects;
create policy store_photos_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'store-photos'
  and public.bo_is_admin_v1(auth.uid())
);

drop policy if exists store_photos_admin_update on storage.objects;
create policy store_photos_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'store-photos'
  and public.bo_is_admin_v1(auth.uid())
)
with check (
  bucket_id = 'store-photos'
  and public.bo_is_admin_v1(auth.uid())
);

drop policy if exists store_photos_admin_delete on storage.objects;
create policy store_photos_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'store-photos'
  and public.bo_is_admin_v1(auth.uid())
);

commit;

-- Verification 1: storage bucket should exist and be public.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'store-photos';

-- Verification 2: policies should exist.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'store_photos_%'
order by policyname;

-- Verification 3: stores.photo_url should exist.
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'stores'
  and column_name = 'photo_url';

-- Follow-up before public frontend can use uploaded images:
--   public.stores_frontend_public_v5, public.search_stores_v2, and
--   public.stores_within_bounds must expose photo_url in their output.
--   Do not recreate those from memory; inspect current definitions first.
