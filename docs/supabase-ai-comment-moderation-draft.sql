-- WCL Supabase AI Comment Moderation Follow-Up
-- Date: 2026-05-18
--
-- Status:
--   Draft for owner review. Run after:
--   docs/supabase-content-policy-moderation-draft.sql
--
-- Why this exists:
--   The first content policy trigger blocks blacklist matches directly.
--   WCL needs more nuance: blacklist should be a warning signal, then AI can
--   allow normal cigar context or block off-platform sales/spam/abuse.
--
-- What this does:
--   - Keeps the database trigger as the final safety net.
--   - Allows comments only when the trusted AI moderation RPC sets a safe
--     decision inside the same transaction.
--   - Adds modal_add_comment_ai_v1 for the Supabase Edge Function
--     moderate_comment_v1.
--   - Removes direct browser execute access from modal_add_comment_v1 and
--     modal_add_comment_ai_v1 so the active app path is forced through the
--     AI moderation Edge Function.
--   - Removes direct browser INSERT access from store_comments.
--
-- What this does not do:
--   - It does not auto-approve stores.
--   - It does not let frontend bypass policy checks.
--   - It does not expose blacklist/whitelist tables to browser roles.

begin;

set local lock_timeout = '5s';

-- The policy matcher is called by the Edge Function through service_role.
grant execute on function public.wcl_text_has_policy_hit_v1(text)
to service_role;

create or replace function public.wcl_enforce_comment_policy_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row jsonb;
  v_comment text;
  v_ai_decision text;
begin
  v_row := to_jsonb(new);
  v_comment := coalesce(v_row->>'comment', '');

  if not public.wcl_text_has_policy_hit_v1(v_comment) then
    return new;
  end if;

  v_ai_decision := current_setting(
    'wcl.ai_moderation_decision',
    true
  );

  if v_ai_decision = 'safe' then
    return new;
  end if;

  raise exception 'WCL_POLICY_BLOCKED_COMMENT'
    using
      errcode = '22023',
      detail = 'Due to WCL policy, we can not post your comment.';
end;
$function$;

create or replace function public.modal_add_comment_ai_v1(
  p_user_id uuid,
  p_store_id bigint,
  p_comment text,
  p_parent_id bigint default null,
  p_ai_decision text default 'block',
  p_user_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text;
begin
  v_role := auth.role();

  if coalesce(v_role, '') <> 'service_role' then
    raise exception 'Forbidden: service role only'
      using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'Missing user id'
      using errcode = '22023';
  end if;

  if lower(coalesce(p_ai_decision, '')) <> 'safe' then
    raise exception 'WCL_POLICY_BLOCKED_COMMENT'
      using
        errcode = '22023',
        detail = 'Due to WCL policy, we can not post your comment.';
  end if;

  perform set_config(
    'wcl.ai_moderation_decision',
    'safe',
    true
  );

  perform set_config(
    'request.jwt.claim.sub',
    p_user_id::text,
    true
  );

  perform set_config(
    'request.jwt.claim.role',
    'authenticated',
    true
  );

  perform set_config(
    'request.jwt.claim.email',
    coalesce(p_user_email, ''),
    true
  );

  perform public.modal_add_comment_v1(
    p_store_id => p_store_id,
    p_comment => p_comment,
    p_parent_id => p_parent_id
  );

  return jsonb_build_object(
    'ok',
    true,
    'decision',
    'safe'
  );
end;
$function$;

revoke all privileges on function public.modal_add_comment_ai_v1(
  uuid,
  bigint,
  text,
  bigint,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.modal_add_comment_ai_v1(
  uuid,
  bigint,
  text,
  bigint,
  text,
  text
) to service_role;

revoke insert, update, truncate on table public.store_comments
from anon, authenticated;

do $$
declare
  v_signature regprocedure;
begin
  for v_signature in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'modal_add_comment_v1',
        'modal_add_comment_ai_v1'
      )
  loop
    execute format(
      'revoke all privileges on function %s from public, anon, authenticated',
      v_signature
    );
  end loop;
end
$$;

commit;

-- Verification:
select
  routine_name as function_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'wcl_text_has_policy_hit_v1',
    'wcl_enforce_comment_policy_v1',
    'modal_add_comment_ai_v1'
  )
order by routine_name;

select
  routine_name as function_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'wcl_text_has_policy_hit_v1',
    'modal_add_comment_v1',
    'modal_add_comment_ai_v1'
  )
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC', 'public')
order by routine_name, grantee, privilege_type;

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
