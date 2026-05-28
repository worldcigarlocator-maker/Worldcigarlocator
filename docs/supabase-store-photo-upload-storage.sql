-- WCL Supabase Store Photo Upload Storage
-- Date: 2026-05-28
--
-- Purpose:
--   Enables admin-only uploads of WCL/venue-approved listing images from the
--   Backoffice Photos tab.
--
-- Safe scope:
--   - Creates/updates one public Storage bucket named store-photos.
--   - Adds public.stores.photo_url if missing.
--   - Allows public read access to uploaded images.
--   - Allows only authenticated WCL admins to upload/update/delete images.
--   - Does not delete store data.
--
-- Important:
--   Only upload images WCL has permission to use.
--   Run only after a Supabase backup exists.

set lock_timeout = '5s';

alter table public.stores
  add column if not exists photo_url text;

comment on column public.stores.photo_url is
  'WCL-controlled replacement image URL. Must not contain copied Google Places photo URLs unless licensed/approved separately.';

alter table public.stores
  drop constraint if exists stores_photo_url_https_check;

alter table public.stores
  add constraint stores_photo_url_https_check
  check (
    photo_url is null
    or photo_url ~* '^https://[^[:space:]]+$'
  );

insert into storage.buckets (
  id,
  name,
  "public",
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
  "public" = excluded."public",
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

-- Verification 1: storage bucket should exist and be public.
select
  id,
  name,
  "public",
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
