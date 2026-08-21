-- Step 5: Client Portal - Share Links
-- Created: 2026-08-18
-- Allows contractors to create shareable links for clients to view project status

-- Project shares table (read-only access for clients)
create table if not exists project_shares (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  share_token text not null unique,
  client_name text not null,
  client_email text,
  created_by_user_id uuid not null,
  created_at timestamptz default now(),
  expires_at timestamptz,
  is_active boolean default true,
  last_accessed_at timestamptz,
  access_count int default 0
);

create index idx_project_shares_token on project_shares(share_token);
create index idx_project_shares_org_project on project_shares(org_code, project_id);
create index idx_project_shares_org_code on project_shares(org_code);
create index idx_project_shares_created_at on project_shares(created_at desc);

-- Add column to control client portal visibility for team members
alter table team_members add column if not exists show_on_client_portal boolean default false;

-- Enable RLS on project_shares
alter table project_shares enable row level security;

-- Team can see shares for projects they access
create policy "project_shares_read_own_org"
  on project_shares for select
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.org_code = project_shares.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

-- Team can create shares for projects in their org
create policy "project_shares_insert_own_org"
  on project_shares for insert
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = project_shares.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

-- Team can update shares (revoke, access tracking)
create policy "project_shares_update_own_org"
  on project_shares for update
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = project_shares.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

grant select, insert, update on public.project_shares to authenticated;
grant select on public.project_shares to anon;  -- Allow anon to read shares via token
