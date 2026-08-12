# Step 3 — Data into Real Tables

**Project:** ProjectManagerWeb (`saas-app`)  
**Supabase project:** PiAR — `ivdszujgmhpkebdgwoav`  
**Goal:** Move projects, areas, notes, and tasks from localStorage blob into Postgres tables with org isolation.

---

## 0. Why this matters

Today, all business data (projects, areas, notes, tasks, teams, clients) lives in a single localStorage JSON blob. This means:
- No multi-user: second browser = no shared data
- No audit trail
- No per-item permissions
- No server-side validation
- Backup = manual export

After Step 3, data lives in Postgres with automatic RLS tenant scoping. Multiple users in the same org see the same projects and can collaborate.

---

## 1. Priority Order

**Phase 1 (this step):** `projects` → `areas` → `notes` → `tasks`  
**Reason:** These are read by the AI assistant. The spec says "Chat, planner, daily works, equipment can stay in the blob longer than expected."

---

## 2. Database Schema

### 2.1 Projects table

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  name text not null,
  manager_user_id uuid references team_members(supabase_user_id),
  client_id uuid,  -- references clients table (Phase 2)
  address text,
  start_date date,
  end_date date,
  status text default 'active' check (status in ('active', 'completed', 'archived')),
  color text,  -- e.g., "#ff5722" for UI
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz,
  archived_by_user_id uuid
);

comment on table projects is 'Construction/service projects belong to an org.';
comment on column projects.org_code is 'Tenant isolation: only that org can access';
```

### 2.2 Areas table (Floors and Rooms)

```sql
create table areas (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  floor text,  -- e.g., "Ground Floor", "1st Floor"
  name text not null,  -- e.g., "Master Bathroom", "Kitchen"
  status text default 'open' check (status in ('open', 'completed', 'blocked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz,
  
  unique(project_id, floor, name)  -- can't have duplicate areas in same project
);

comment on table areas is 'Subdivisions of projects (floors, rooms, zones).';
```

### 2.3 Notes table

```sql
create table notes (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  area_id uuid references areas(id) on delete set null,
  title text,
  content text,
  note_style text default 'text' check (note_style in ('text', 'checklist')),
  checklist jsonb,  -- array of {text, done}
  image_storage_path text,  -- storage path if note has image
  image_name text,
  show_on_master_plan boolean default false,
  created_by_user_id uuid not null references team_members(supabase_user_id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz,
  archived_by_user_id uuid
);

comment on table notes is 'Text notes, checklists, progress notes.';
```

### 2.4 Tasks table

```sql
create table tasks (
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
```

### 2.5 Photos and Files (Reference)

For Phase 1, photos and files stay in Supabase Storage (already migrated in Step 1). We create link tables in Phase 2 if needed, or leave them unlinked in the database for now.

### 2.6 RLS Policies

**Enable RLS on all tables:**

```sql
alter table projects enable row level security;
alter table areas enable row level security;
alter table notes enable row level security;
alter table tasks enable row level security;
```

**Org-scoped policies (read, create, update, delete by org):**

```sql
-- Projects: read own org
create policy "projects_read_own_org"
  on projects for select
  to authenticated
  using (org_code = auth.jwt() ->> 'org_code');

-- Projects: admin can create/update/delete
create policy "projects_write_admin"
  on projects for insert, update, delete
  to authenticated
  with check (
    org_code = auth.jwt() ->> 'org_code'
    and exists (
      select 1 from team_members tm
      where tm.org_code = projects.org_code
        and tm.supabase_user_id = auth.uid()
        and tm.role = 'admin'
    )
  );

-- Areas: read own org's projects
create policy "areas_read_own_org"
  on areas for select
  to authenticated
  using (
    org_code = auth.jwt() ->> 'org_code'
    and exists (
      select 1 from projects p
      where p.id = areas.project_id
        and p.org_code = auth.jwt() ->> 'org_code'
    )
  );

-- Areas: can create/update in own projects (admin or worker)
create policy "areas_write_in_project"
  on areas for insert, update
  to authenticated
  with check (
    org_code = auth.jwt() ->> 'org_code'
    and exists (
      select 1 from projects p
      where p.id = areas.project_id
        and p.org_code = auth.jwt() ->> 'org_code'
    )
  );

-- Notes: read own org
create policy "notes_read_own_org"
  on notes for select
  to authenticated
  using (org_code = auth.jwt() ->> 'org_code');

-- Notes: can create/update in own org
create policy "notes_write_own_org"
  on notes for insert, update
  to authenticated
  with check (org_code = auth.jwt() ->> 'org_code');

-- Notes: only creator or admin can delete
create policy "notes_delete_own"
  on notes for delete
  to authenticated
  using (
    org_code = auth.jwt() ->> 'org_code'
    and (
      created_by_user_id = auth.uid()
      or exists (
        select 1 from team_members tm
        where tm.org_code = notes.org_code
          and tm.supabase_user_id = auth.uid()
          and tm.role = 'admin'
      )
    )
  );

-- Tasks: similar pattern
create policy "tasks_read_own_org"
  on tasks for select
  to authenticated
  using (org_code = auth.jwt() ->> 'org_code');

create policy "tasks_write_own_org"
  on tasks for insert, update
  to authenticated
  with check (org_code = auth.jwt() ->> 'org_code');
```

### 2.7 Table Permissions

```sql
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.areas to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
```

---

## 3. Frontend Changes

### 3.1 Data model in appback.js

Today:
```js
let state = {
  projects: [],  // localStorage JSON
  ...
};
```

After Step 3:
```js
let state = {
  projects: [],  // loaded from Postgres on login
  areas: [],
  notes: [],
  tasks: [],
  ...
};
```

### 3.2 Load data on login

After successful login in `loginWithOrgCodeAndPin()`, fetch all data:

```js
async function loadOrgData() {
  const orgCode = state.currentOrgCode;
  
  try {
    const [projects, areas, notes, tasks] = await Promise.all([
      supabase.from('projects').select('*').eq('org_code', orgCode),
      supabase.from('areas').select('*').eq('org_code', orgCode),
      supabase.from('notes').select('*').eq('org_code', orgCode),
      supabase.from('tasks').select('*').eq('org_code', orgCode),
    ]);
    
    state.projects = projects.data || [];
    state.areas = areas.data || [];
    state.notes = notes.data || [];
    state.tasks = tasks.data || [];
    
    persist();
    render();
  } catch (error) {
    showAppMessage("Failed to load project data: " + error.message, "error");
  }
}
```

### 3.3 Create/update functions

Replace localStorage-only saves with Supabase calls:

```js
async function saveProject(project) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .upsert({...project, org_code: state.currentOrgCode}, {onConflict: 'id'})
      .select()
      .single();
    
    if (error) throw error;
    
    const idx = state.projects.findIndex(p => p.id === project.id);
    if (idx >= 0) state.projects[idx] = data;
    else state.projects.push(data);
    
    persist();  // still save to localStorage for offline, but DB is source of truth
    return data;
  } catch (error) {
    showAppMessage("Failed to save project: " + error.message, "error");
    throw error;
  }
}
```

Similar functions for areas, notes, tasks.

### 3.4 Delete functions

```js
async function deleteNote(noteId) {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('org_code', state.currentOrgCode);
    
    if (error) throw error;
    
    state.notes = state.notes.filter(n => n.id !== noteId);
    persist();
    render();
  } catch (error) {
    showAppMessage("Failed to delete note: " + error.message, "error");
  }
}
```

---

## 4. Data Migration (localStorage → Postgres)

One-time, runs on first login after Step 3:

```js
async function migrateLocalStorageToDB() {
  if (state.migratedToDBAt) return;  // only once
  
  const orgCode = state.currentOrgCode;
  const pending = [];
  
  // Collect all projects/areas/notes/tasks from state
  for (const project of state.projects || []) {
    pending.push({ table: 'projects', data: {...project, org_code: orgCode} });
  }
  for (const area of state.areas || []) {
    pending.push({ table: 'areas', data: {...area, org_code: orgCode} });
  }
  for (const note of state.notes || []) {
    pending.push({ table: 'notes', data: {...note, org_code: orgCode, created_by_user_id: note.createdByUserId} });
  }
  for (const task of state.tasks || []) {
    pending.push({ table: 'tasks', data: {...task, org_code: orgCode} });
  }
  
  if (!pending.length) {
    state.migratedToDBAt = new Date().toISOString();
    persist();
    return;
  }
  
  showAppMessage(`Migrating ${pending.length} items to cloud...`, "info");
  
  for (const item of pending) {
    try {
      const { error } = await supabase
        .from(item.table)
        .insert([item.data]);
      
      if (error && error.code !== '23505') throw error;  // ignore duplicate key errors
    } catch (error) {
      console.error(`Migration failed for ${item.table}:`, error);
    }
  }
  
  state.migratedToDBAt = new Date().toISOString();
  persist();
  showAppMessage("Migration complete.", "success");
}
```

---

## 5. Test Plan

### 5.1 Prerequisites

1. Run the migration from section 2 in Supabase SQL Editor
2. Grant permissions from section 2.7
3. Create a dev project manually via SQL for testing

### 5.2 Tests

**Test 1: Load org data on login**
```
- Login as admin (P00000000/admin/123456)
- state.projects, state.areas, state.notes, state.tasks should populate from DB
- App should render without "no projects" error
```

**Test 2: Create project**
```
- Click "Create new project"
- Fill in name, date, etc.
- Click Save
- Should appear in both state.projects and Supabase projects table
- Reload page → project still there (not just localStorage)
```

**Test 3: Org isolation**
```
- Query: SELECT * FROM projects WHERE org_code != 'P00000000' as logged-in user
- Should return 0 rows (RLS blocks cross-org reads)
```

**Test 4: Create area under project**
```
- Open a project
- Add area/floor
- Should insert into areas table with project_id link
- Reload → area still there
```

**Test 5: Create note**
```
- Click "Add Note"
- Create a note, attach to area
- Should insert into notes table
- Reload → note still there with correct area_id
```

**Test 6: localStorage still works for offline**
```
- Create a project while connected
- Go offline (DevTools Network Throttle → Offline)
- Modify the project locally
- Go back online
- Should sync back to DB
```

**Test 7: Multi-user consistency**
```
- User A creates a project in Org P00000000
- User B (same org) reloads → sees the same project
- (if you have second test user; requires manual setup)
```

---

## 6. Done Criteria

Step 3 is complete when:

1. ✓ Projects, areas, notes, tasks in Postgres with org_code on each
2. ✓ RLS policies enforce org isolation
3. ✓ Login flow loads all org data on authentication
4. ✓ Create/update/delete functions use Supabase (DB is source of truth)
5. ✓ localStorage migration runs once per org, zero data loss
6. ✓ All test plan checks pass
7. ✓ Multi-user org members see the same data
8. ✓ Reload survives (data is server-backed, not browser-only)

After Step 3: **data is multi-user and persistent.** Multiple team members in the same org see and can edit the same projects, areas, notes, and tasks.

---

## 7. Guardrails

- `org_code` on EVERY row. No row touches without it.
- RLS first, always. Test that cross-org reads fail before going live.
- localStorage still gets `persist()` calls for offline cache (not removed yet).
- Don't delete old localStorage — keep it until Step 4 verifies backup to Drive is working.
- Migration is one-time (`migratedToDBAt` flag prevents re-run).
- If a migration fails mid-item, the partial state is recoverable (don't lose data).

---

## 8. After Step 3

- Step 4: Daily backup to Google Drive (admin can rest easy)
- Step 5: Client portal (end-customer sees published subset)
- Phase 2: Extend to chat, planner, daily works, equipment
