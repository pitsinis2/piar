-- Step 4: Backup History Tracking
-- Created: 2026-08-17
-- Tracks all backups for audit trail and support debugging

create table if not exists backup_history (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  backup_file_id text not null,
  backup_file_name text not null,
  backup_size_kb int not null,
  backup_checksum text,
  backup_status text default 'success' check (backup_status in ('success', 'failed', 'partial')),
  error_message text,
  created_by_user_id uuid not null,
  created_at timestamptz default now(),
  notes text
);

create index idx_backup_history_org_code on backup_history(org_code);
create index idx_backup_history_created_at on backup_history(created_at desc);
create index idx_backup_history_org_created on backup_history(org_code, created_at desc);

alter table backup_history enable row level security;

drop policy if exists "backup_history_read_own_org" on backup_history;
drop policy if exists "backup_history_insert_own_org" on backup_history;

create policy "backup_history_read_own_org"
  on backup_history for select
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.org_code = backup_history.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "backup_history_insert_own_org"
  on backup_history for insert
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = backup_history.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

grant select, insert on public.backup_history to authenticated;
