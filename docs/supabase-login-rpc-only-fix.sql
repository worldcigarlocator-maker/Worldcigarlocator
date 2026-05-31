-- WCL Supabase Login RPC Only Fix
-- Date: 2026-05-31
--
-- Purpose:
--   Ensures authenticated member logins are logged server-side, outside cookie
--   consent and outside the older public analytics fallback.
--
-- Expected after this is live:
--   New rows in analytics_events for real sign-ins/session activity should have:
--     event_type = 'user_login'
--     payload->>'logged_by' = 'log_user_login_v1'
--     payload->>'user_id' = the authenticated member UUID

begin;

set local lock_timeout = '5s';

create or replace function public.log_user_login_v1(
  p_source text default 'login'
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $wcl$
declare
  v_uid uuid := auth.uid();
  v_source text := coalesce(nullif(trim(p_source), ''), 'login');
begin
  if v_uid is null then
    raise exception 'Unauthorized: no auth.uid()' using errcode = '28000';
  end if;

  insert into public.analytics_events (
    event_type,
    source,
    payload
  )
  values (
    'user_login',
    v_source,
    jsonb_build_object(
      'user_id', v_uid::text,
      'source', v_source,
      'logged_by', 'log_user_login_v1'
    )
  );
end;
$wcl$;

revoke all privileges on function public.log_user_login_v1(text)
from public, anon;

grant execute on function public.log_user_login_v1(text)
to authenticated;

-- Make PostgREST/Supabase API notice the function immediately.
notify pgrst, 'reload schema';

commit;

-- Verification: should show only authenticated EXECUTE.
select
  routine_name as function_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'log_user_login_v1'
  and grantee in ('anon', 'authenticated', 'PUBLIC', 'public')
order by routine_name, grantee, privilege_type;
