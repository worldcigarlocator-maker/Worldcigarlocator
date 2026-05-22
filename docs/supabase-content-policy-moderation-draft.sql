-- WCL Supabase Content Policy Moderation Draft
-- Date: 2026-05-18
--
-- Status:
--   Draft for owner review. Run only after backup/export exists.
--
-- Why this exists:
--   Public comments should not be posted when they match WCL policy-blocked
--   language. Public add-store submissions should stay reviewable, but should
--   be flagged when submitted content matches the same policy list.
--
-- What this does:
--   - Reads terms from public.keywords_blacklist and public.keywords_whitelist.
--   - Blocks store_comments inserts/updates when comment text matches blacklist
--     after whitelist terms are removed.
--   - Flags store_pending inserts/updates when listing text matches blacklist,
--     if the table has flagged/flag_reason/status columns.
--   - Keeps human moderation as final authority.
--
-- What this does not do:
--   - It does not delete existing comments.
--   - It does not delete pending listings.
--   - It does not auto-approve or auto-reject stores.
--   - It does not expose blacklist/whitelist tables to the browser.

begin;

set local lock_timeout = '5s';

-- Flexible term reader:
-- Supports common column names without exposing keyword tables publicly.
create or replace function public.wcl_policy_terms_v1(p_table_name text)
returns table(term text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_regclass regclass;
  v_column text;
begin
  v_regclass := to_regclass(format('public.%I', p_table_name));

  if v_regclass is null then
    return;
  end if;

  select c.column_name
    into v_column
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = p_table_name
    and c.data_type in ('text', 'character varying', 'varchar')
    and c.column_name in (
      'keyword',
      'word',
      'phrase',
      'term',
      'value',
      'pattern',
      'name'
    )
  order by array_position(
    array[
      'keyword',
      'word',
      'phrase',
      'term',
      'value',
      'pattern',
      'name'
    ],
    c.column_name
  )
  limit 1;

  if v_column is null then
    return;
  end if;

  return query execute format(
    'select trim(%1$I)::text
       from %2$s
      where nullif(trim(%1$I), '''') is not null',
    v_column,
    v_regclass
  );
end;
$function$;

revoke all privileges on function public.wcl_policy_terms_v1(text)
from public, anon, authenticated;

-- Main policy matcher:
-- Whitelist terms are removed first so accepted domain words can override
-- broad blacklist entries.
create or replace function public.wcl_text_has_policy_hit_v1(p_text text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_text text;
  v_term text;
begin
  v_text := lower(coalesce(p_text, ''));

  if nullif(trim(v_text), '') is null then
    return false;
  end if;

  for v_term in
    select lower(term)
    from public.wcl_policy_terms_v1('keywords_whitelist')
    where nullif(trim(term), '') is not null
  loop
    v_text := replace(
      v_text,
      v_term,
      repeat(' ', greatest(length(v_term), 1))
    );
  end loop;

  for v_term in
    select lower(term)
    from public.wcl_policy_terms_v1('keywords_blacklist')
    where nullif(trim(term), '') is not null
  loop
    if position(v_term in v_text) > 0 then
      return true;
    end if;
  end loop;

  return false;
end;
$function$;

revoke all privileges on function public.wcl_text_has_policy_hit_v1(text)
from public, anon, authenticated;

-- Comments are blocked outright because they become visible to users.
create or replace function public.wcl_enforce_comment_policy_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row jsonb;
  v_comment text;
begin
  v_row := to_jsonb(new);
  v_comment := coalesce(v_row->>'comment', '');

  if public.wcl_text_has_policy_hit_v1(v_comment) then
    raise exception 'WCL_POLICY_BLOCKED_COMMENT'
      using
        errcode = '22023',
        detail = 'Due to WCL policy, we can not post your comment.';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_wcl_enforce_comment_policy
on public.store_comments;

create trigger trg_wcl_enforce_comment_policy
before insert or update
on public.store_comments
for each row
execute function public.wcl_enforce_comment_policy_v1();

-- Add-store submissions remain pending for owner review, but are flagged
-- when table columns exist to support that.
create or replace function public.wcl_flag_store_pending_policy_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row jsonb;
  v_text text;
  v_patch jsonb := '{}'::jsonb;
begin
  v_row := to_jsonb(new);

  v_text := concat_ws(
    ' ',
    v_row->>'name',
    v_row->>'address',
    v_row->>'city',
    v_row->>'state',
    v_row->>'country',
    v_row->>'phone',
    v_row->>'website',
    v_row->>'comment',
    v_row->>'types'
  );

  if public.wcl_text_has_policy_hit_v1(v_text) then
    if v_row ? 'flagged' then
      v_patch := v_patch || jsonb_build_object('flagged', true);
    end if;

    if v_row ? 'flag_reason' then
      v_patch := v_patch || jsonb_build_object(
        'flag_reason',
        'content_policy'
      );
    end if;

    if v_row ? 'status' then
      v_patch := v_patch || jsonb_build_object(
        'status',
        'pending'
      );
    end if;

    if v_patch <> '{}'::jsonb then
      new := jsonb_populate_record(new, v_patch);
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_wcl_flag_store_pending_policy
on public.store_pending;

create trigger trg_wcl_flag_store_pending_policy
before insert or update
on public.store_pending
for each row
execute function public.wcl_flag_store_pending_policy_v1();

commit;

-- Verification:
select
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and trigger_name in (
    'trg_wcl_enforce_comment_policy',
    'trg_wcl_flag_store_pending_policy'
  )
order by event_object_table, trigger_name, event_manipulation;

select
  routine_name as function_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'wcl_policy_terms_v1',
    'wcl_text_has_policy_hit_v1',
    'wcl_enforce_comment_policy_v1',
    'wcl_flag_store_pending_policy_v1'
  )
order by routine_name;
