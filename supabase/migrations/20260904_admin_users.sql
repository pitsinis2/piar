-- Who is allowed to use the admin panel.
--
-- The panel used to be gated by a static token embedded in its own page, which
-- meant anyone who opened the page could read it. It is now gated by a real
-- Supabase Auth session plus this allowlist, so the browser never holds a
-- long-lived secret and access can be revoked per person.
--
-- Keyed by email rather than user_id so an address can be authorised before
-- the account exists, and so revoking someone does not depend on looking up an
-- id first. The edge function compares against the verified email in the JWT.

drop table if exists public.platform_admins;

create table public.platform_admins (
  email text primary key,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is
  'Email addresses allowed to use the admin panel. Checked by the admin-org function against the verified email on the session.';

alter table public.platform_admins enable row level security;
-- No policies: only the service role (the edge function) can read this. RLS
-- with no policy denies anon and authenticated outright.

insert into public.platform_admins (email, note)
values ('pitsinisf@gmail.com', 'Owner')
on conflict (email) do update set active = true;
