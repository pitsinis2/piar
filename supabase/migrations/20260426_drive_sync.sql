-- Google Drive sync scheduling scaffold
-- Requires: pgcrypto (gen_random_uuid)

create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists company_drive_sync_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  enabled boolean not null default false,
  timezone text not null default 'UTC',
  time1 text not null default '08:00',
  time2 text not null default '18:00',
  last_run_1_local_date date,
  last_run_2_local_date date,
  last_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists company_drive_oauth (
  company_id uuid primary key references companies(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  token_type text,
  drive_root_folder_id text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists drive_sync_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  error text,
  details jsonb not null default '{}'::jsonb
);

-- Claims companies that are due to sync right now.
-- This function is designed for a 15-minute cron trigger. It uses SKIP LOCKED so two concurrent calls
-- do not claim the same company at the same time.
create or replace function drive_sync_claim_due_companies()
returns table(company_id uuid, slot smallint)
language plpgsql
security definer
as $$
declare
  rec record;
  local_now timestamp;
  local_date date;
  local_time text;
begin
  for rec in
    select
      s.company_id,
      s.timezone,
      s.time1,
      s.time2,
      s.last_run_1_local_date,
      s.last_run_2_local_date
    from company_drive_sync_settings s
    where s.enabled = true
    for update skip locked
  loop
    local_now := (now() at time zone rec.timezone);
    local_date := local_now::date;
    local_time := to_char(local_now, 'HH24:MI');

    if local_time = rec.time1 and (rec.last_run_1_local_date is distinct from local_date) then
      update company_drive_sync_settings
        set last_run_1_local_date = local_date,
            updated_at = now()
      where company_id = rec.company_id;
      company_id := rec.company_id;
      slot := 1;
      return next;
    elsif local_time = rec.time2 and (rec.last_run_2_local_date is distinct from local_date) then
      update company_drive_sync_settings
        set last_run_2_local_date = local_date,
            updated_at = now()
      where company_id = rec.company_id;
      company_id := rec.company_id;
      slot := 2;
      return next;
    end if;
  end loop;
end;
$$;

