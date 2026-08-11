-- Step 3: Data into Real Tables
-- Created: 2026-08-11
-- Moves projects, areas, notes, tasks from localStorage into Postgres with org isolation

create extension if not exists pgcrypto;

-- Ensure team_members has unique constraint for FK references
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'unique_org_user'
  ) then
    alter table team_members add constraint unique_org_user unique(org_code, supabase_user_id);
  end if;
end $$;

-- Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  name text not null,
  manager_user_id uuid references team_members(supabase_user_id),
  client_id uuid,
  address text,
  start_date date,
  end_date date,
  status text default 'active' check (status in ('active', 'completed', 'archived')),
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz,
  archived_by_user_id uuid
);

comment on table projects is 'Construction/service projects belong to an org.';
comment on column projects.org_code is 'Tenant isolation: only that org can access.';

-- Areas table (floors, rooms, zones)
create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  floor text,
  name text not null,
  status text default 'open' check (status in ('open', 'completed', 'blocked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz,

  unique(project_id, floor, name)
);

comment on table areas is 'Subdivisions of projects (floors, rooms, zones).';

-- Notes table
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  area_id uuid references areas(id) on delete set null,
  title text,
  content text,
  note_style text default 'text' check (note_style in ('text', 'checklist')),
  checklist jsonb,
  image_storage_path text,
  image_name text,
  show_on_master_plan boolean default false,
  created_by_user_id uuid not null references team_members(supabase_user_id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz,
  archived_by_user_id uuid
);

comment on table notes is 'Text notes, checklists, progress notes.';

-- Tasks table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  area_id uuid references areas(id) on delete set null,
  title text not null,
  status text default 'open' check (status in ('open', 'started', 'paused', 'done')),
  assigned_member_id uuid references team_members(supabase_user_id),
  due_date date,
  created_by_user_id uuid not null references team_members(supabase_user_id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz
);

comment on table tasks is 'Action items scoped to projects/areas.';

-- Enable RLS on all tables
alter table projects enable row level security;
alter table areas enable row level security;
alter table notes enable row level security;
alter table tasks enable row level security;

-- Projects policies
create policy "projects_read_own_org"
  on projects for select
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.org_code = projects.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "projects_insert_admin"
  on projects for insert
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = projects.org_code
        and tm.supabase_user_id = auth.uid()
        and tm.role = 'admin'
    )
  );

create policy "projects_update_admin"
  on projects for update
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = projects.org_code
        and tm.supabase_user_id = auth.uid()
        and tm.role = 'admin'
    )
  );

create policy "projects_delete_admin"
  on projects for delete
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.org_code = projects.org_code
        and tm.supabase_user_id = auth.uid()
        and tm.role = 'admin'
    )
  );

-- Areas policies
create policy "areas_read_own_org"
  on areas for select
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.org_code = areas.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "areas_insert_in_project"
  on areas for insert
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = areas.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "areas_update_in_project"
  on areas for update
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = areas.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

-- Notes policies
create policy "notes_read_own_org"
  on notes for select
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.org_code = notes.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "notes_insert_own_org"
  on notes for insert
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = notes.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "notes_update_own_org"
  on notes for update
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = notes.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "notes_delete_own"
  on notes for delete
  to authenticated
  using (
    (
      created_by_user_id = auth.uid()
      or exists (
        select 1 from team_members tm
        where tm.org_code = notes.org_code
          and tm.supabase_user_id = auth.uid()
          and tm.role = 'admin'
      )
    )
    and exists (
      select 1 from team_members tm2
      where tm2.org_code = notes.org_code
        and tm2.supabase_user_id = auth.uid()
    )
  );

-- Tasks policies
create policy "tasks_read_own_org"
  on tasks for select
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.org_code = tasks.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "tasks_insert_own_org"
  on tasks for insert
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = tasks.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "tasks_update_own_org"
  on tasks for update
  to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.org_code = tasks.org_code
        and tm.supabase_user_id = auth.uid()
    )
  );

create policy "tasks_delete_own"
  on tasks for delete
  to authenticated
  using (
    (
      created_by_user_id = auth.uid()
      or exists (
        select 1 from team_members tm
        where tm.org_code = tasks.org_code
          and tm.supabase_user_id = auth.uid()
          and tm.role = 'admin'
      )
    )
    and exists (
      select 1 from team_members tm2
      where tm2.org_code = tasks.org_code
        and tm2.supabase_user_id = auth.uid()
    )
  );

-- Grant permissions
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.areas to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
