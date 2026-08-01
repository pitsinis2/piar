-- Initial SaaS schema draft.
-- Supabase/PostgreSQL will be the source of truth.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  drive_root_folder_id text,
  max_active_users integer not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'worker')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_number text not null,
  name text not null,
  address text,
  status text not null default 'active',
  drive_folder_id text,
  created_at timestamptz not null default now(),
  unique (company_id, project_number)
);

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  drive_folder_id text,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  floor_id uuid references public.floors(id) on delete set null,
  name text not null,
  drive_folder_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.service_teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.service_team_members (
  team_id uuid not null references public.service_teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (team_id, user_id)
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  team_id uuid references public.service_teams(id) on delete set null,
  kind text not null check (kind in ('photo', 'file', 'plan')),
  name text not null,
  mime_type text,
  drive_file_id text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  team_id uuid references public.service_teams(id) on delete set null,
  title text,
  body text not null,
  drive_file_id text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  body text not null,
  is_important boolean not null default false,
  copied_note_id uuid references public.notes(id) on delete set null,
  created_at timestamptz not null default now()
);

