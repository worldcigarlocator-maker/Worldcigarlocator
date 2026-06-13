-- WCL Supabase Store Pending Admin Edit
-- Date: 2026-06-12
--
-- Purpose:
--   Allow a verified WCL admin to correct a pending listing before approval.
--
-- Safety:
--   - Does not grant direct UPDATE access to store_pending.
--   - Verifies auth.uid() and bo_is_admin_v1() inside the function.
--   - Only updates the pending row identified by p_id.
--   - Never updates public.stores.
--   - Does not approve, reject, insert or delete listings.

begin;

set local lock_timeout = '5s';

create or replace function public.bo_update_store_pending_v1(
  p_id bigint,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_country text;
  v_country_iso2 text;
  v_access text;
  v_types jsonb;
  v_updated_id bigint;
begin
  if v_uid is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  if not coalesce(public.bo_is_admin_v1(v_uid), false) then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  if p_id is null or p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'A pending ID and patch object are required' using errcode = '22023';
  end if;

  v_name := nullif(trim(p_patch->>'name'), '');
  v_country := nullif(trim(p_patch->>'country'), '');
  v_country_iso2 := upper(nullif(trim(p_patch->>'country_iso2'), ''));
  v_access := lower(nullif(trim(p_patch->>'access'), ''));

  if v_name is null then
    raise exception 'name is required' using errcode = '23502';
  end if;

  if v_country is null then
    raise exception 'country is required' using errcode = '23502';
  end if;

  if v_country_iso2 is null or v_country_iso2 !~ '^[A-Z]{2}$' then
    raise exception 'country_iso2 must contain two letters' using errcode = '22023';
  end if;

  if v_access is null or v_access not in ('public', 'members') then
    raise exception 'access must be public or members' using errcode = '22023';
  end if;

  if jsonb_typeof(p_patch->'types') <> 'array' then
    raise exception 'types must be an array' using errcode = '22023';
  end if;

  select jsonb_agg(valid_type order by valid_type)
  into v_types
  from (
    select distinct lower(trim(t.value)) as valid_type
    from jsonb_array_elements_text(p_patch->'types') as t(value)
    where lower(trim(t.value)) in ('store', 'lounge')
  ) normalized_types;

  if coalesce(jsonb_array_length(v_types), 0) = 0 then
    raise exception 'at least one valid type is required' using errcode = '22023';
  end if;

  update public.store_pending
  set
    name = v_name,
    address = nullif(trim(p_patch->>'address'), ''),
    city = nullif(trim(p_patch->>'city'), ''),
    state = nullif(trim(p_patch->>'state'), ''),
    country = v_country,
    country_iso2 = v_country_iso2,
    phone = nullif(trim(p_patch->>'phone'), ''),
    website = nullif(trim(p_patch->>'website'), ''),
    place_id = nullif(trim(p_patch->>'place_id'), ''),
    types = v_types,
    access = v_access
  where id = p_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Pending listing not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'ok', true,
    'pending_id', v_updated_id,
    'updated_by', v_uid
  );
end;
$function$;

revoke all privileges on function public.bo_update_store_pending_v1(bigint, jsonb)
from public, anon;

grant execute on function public.bo_update_store_pending_v1(bigint, jsonb)
to authenticated;

commit;

-- Verification: expected result is authenticated / EXECUTE only.
select
  routine_name as function_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'bo_update_store_pending_v1'
order by grantee;
