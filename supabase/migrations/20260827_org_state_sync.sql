-- Cloud sync: per-org private workspace state
-- Created: 2026-08-27
-- Each organization stores its complete workspace state as one JSONB blob.
-- RLS guarantees hard isolation: only authenticated members of an org can
-- read or write that org's state. No org can ever see another org's data.

create table if not exists org_state (
  org_code text primary key references org_codes(org_code) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid
);

comment on table org_state is 'Full workspace state per org (private per-tenant cloud save).';

alter table org_state enable row level security;

drop policy if exists "org_state_read_own_org" on org_state;
drop policy if exists "org_state_insert_own_org" on org_state;
drop policy if exists "org_state_update_own_org" on org_state;

create policy "org_state_read_own_org"
  on org_state for select
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.org_code = org_state.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "org_state_insert_own_org"
  on org_state for insert
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = org_state.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "org_state_update_own_org"
  on org_state for update
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.org_code = org_state.org_code
        and tm.supabase_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = org_state.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

grant select, insert, update on public.org_state to authenticated;
