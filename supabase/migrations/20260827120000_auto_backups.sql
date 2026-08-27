-- Automatic daily server-side backups
-- Created: 2026-08-27
-- Snapshots every org's workspace state daily into org_backups.
-- 30-day retention. Runs inside the database via pg_cron - no client
-- interaction, no external services. Each org can only read its own backups.

create extension if not exists pg_cron;

create table if not exists org_backups (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  state jsonb not null,
  backed_up_at timestamptz not null default now()
);

comment on table org_backups is 'Daily snapshots of org_state. 30-day retention via pg_cron.';

create index if not exists idx_org_backups_org_time on org_backups(org_code, backed_up_at desc);

alter table org_backups enable row level security;

drop policy if exists "org_backups_read_own_org" on org_backups;

create policy "org_backups_read_own_org"
  on org_backups for select
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.org_code = org_backups.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

-- No insert/update/delete policies for clients: only the scheduled job
-- (running as the table owner) writes backups.
grant select on public.org_backups to authenticated;

-- The snapshot job
create or replace function run_org_backups()
returns void
language sql
security definer
set search_path = public
as $$
  insert into org_backups (org_code, state)
  select org_code, state from org_state;
  delete from org_backups where backed_up_at < now() - interval '30 days';
$$;

-- Schedule daily at 02:00 UTC (idempotent: unschedule first if it exists)
do $$
begin
  perform cron.unschedule('daily-org-backups');
exception when others then
  null;
end $$;

select cron.schedule('daily-org-backups', '0 2 * * *', 'select run_org_backups()');
