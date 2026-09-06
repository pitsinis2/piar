-- Login activity for the admin panel.
--
-- auth.sessions already records when a session started, the IP it came from,
-- the browser, and when the token was last refreshed. PostgREST does not expose
-- the auth schema, so this function is the way the admin-org edge function
-- reads it.
--
-- SECURITY DEFINER because auth.sessions is not readable by ordinary roles.
-- Execute is granted to service_role only - the edge function already checks
-- that the caller is a platform admin before it calls this.

create or replace function public.org_login_sessions(p_org_code text)
returns table (
  username text,
  ip text,
  user_agent text,
  login_at timestamptz,
  last_seen_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    tm.username,
    host(s.ip)                              as ip,
    s.user_agent,
    s.created_at                            as login_at,
    -- refreshed_at is only set once a token has been renewed; before that the
    -- session has not been seen again since it started.
    coalesce(s.refreshed_at, s.updated_at, s.created_at) as last_seen_at
  from auth.sessions s
  join public.team_members tm on tm.supabase_user_id = s.user_id
  where tm.org_code = p_org_code
  order by s.created_at desc
$$;

revoke all on function public.org_login_sessions(text) from public;
revoke all on function public.org_login_sessions(text) from anon;
revoke all on function public.org_login_sessions(text) from authenticated;
grant execute on function public.org_login_sessions(text) to service_role;
