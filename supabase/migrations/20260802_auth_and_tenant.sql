-- Step 2: Auth and tenant separation
-- Created: 2026-08-02
-- Adds org_codes, team_members, and RLS policies for multi-tenant auth

create extension if not exists pgcrypto;

-- Org codes table (tenants)
create table if not exists org_codes (
  org_code text primary key,
  name text not null,
  max_active_users integer default 5,
  created_at timestamptz default now()
);

comment on table org_codes is 'Tenants/organizations. Org code is the primary key and never changes.';
comment on column org_codes.org_code is 'Format: P12345678 (P + 8 digits). Must match getTenantId() return value.';
comment on column org_codes.max_active_users is 'Manual license limit for first customers. Step 2 logic only.';

-- Team members table
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  supabase_user_id uuid references auth.users(id) on delete cascade,
  username text not null,
  email text,
  active boolean default true,
  role text default 'worker' check (role in ('admin', 'worker')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(org_code, username)
);

comment on table team_members is 'Team members belong to orgs. Multiple members per org; one supabase_user_id per member.';
comment on column team_members.username is 'Unique within org. NOT the Supabase email. Used in login UI.';
comment on column team_members.email is 'Optional; can differ from synthetic Supabase email.';
comment on column team_members.role is 'admin: can manage org/users. worker: upload/view only.';

-- Seed dev org
insert into org_codes (org_code, name, max_active_users)
values ('P00000000', 'Dev Org', 999)
on conflict do nothing;

-- Enable RLS
alter table org_codes enable row level security;
alter table team_members enable row level security;

-- org_codes policies
drop policy if exists "org_codes_read_public" on org_codes;
drop policy if exists "org_codes_update_admin_only" on org_codes;

-- Anyone can read org info (needed for signup)
create policy "org_codes_read_public"
  on org_codes for select
  to anon, authenticated
  using (true);

-- Only org admins can update their own org
create policy "org_codes_update_admin_only"
  on org_codes for update
  to authenticated
  using (
    auth.jwt() ->> 'org_code' = org_code
    and exists (
      select 1 from team_members
      where org_code = org_codes.org_code
        and supabase_user_id = auth.uid()
        and role = 'admin'
    )
  );

-- team_members policies
drop policy if exists "team_members_read_own_org" on team_members;
drop policy if exists "team_members_read_anon" on team_members;
drop policy if exists "team_members_insert_admin_only" on team_members;
drop policy if exists "team_members_update_admin_or_self" on team_members;

-- Users can see team members in their own org
create policy "team_members_read_own_org"
  on team_members for select
  to authenticated
  using (org_code = auth.jwt() ->> 'org_code');

-- Anon can read to display login feedback (e.g. "user exists")
create policy "team_members_read_anon"
  on team_members for select
  to anon
  using (true);

-- Only org admins can create new members
create policy "team_members_insert_admin_only"
  on team_members for insert
  to authenticated
  with check (
    org_code = auth.jwt() ->> 'org_code'
    and exists (
      select 1 from team_members tm
      where tm.org_code = team_members.org_code
        and tm.supabase_user_id = auth.uid()
        and tm.role = 'admin'
    )
  );

-- Members can update their own record, admins can update anyone in their org
create policy "team_members_update_admin_or_self"
  on team_members for update
  to authenticated
  using (
    org_code = auth.jwt() ->> 'org_code'
    and (
      supabase_user_id = auth.uid()
      or exists (
        select 1 from team_members tm
        where tm.org_code = team_members.org_code
          and tm.supabase_user_id = auth.uid()
          and tm.role = 'admin'
      )
    )
  );

-- Close the dev storage policies from Step 1
drop policy if exists "dev_anon_read" on storage.objects;
drop policy if exists "dev_anon_write" on storage.objects;
drop policy if exists "dev_anon_update" on storage.objects;

-- New storage policies: only authenticated users in their own org
drop policy if exists "auth_tenant_read" on storage.objects;
drop policy if exists "auth_tenant_write" on storage.objects;
drop policy if exists "auth_tenant_update" on storage.objects;

create policy "auth_tenant_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = auth.jwt() ->> 'org_code'
  );

create policy "auth_tenant_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = auth.jwt() ->> 'org_code'
  );

create policy "auth_tenant_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = auth.jwt() ->> 'org_code'
  );
