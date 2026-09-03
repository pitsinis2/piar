-- Photo/file uploads were rejected for every user with
--   "new row violates row-level security policy" (403).
--
-- The Step 2 policies gate on `auth.jwt() ->> 'org_code'`, but nothing ever
-- writes that claim: accounts are created by the admin-org / member-login
-- functions with no user_metadata, and org membership lives in team_members.
-- The claim is therefore always NULL, `prefix = NULL` is NULL rather than
-- true, and every insert is denied.
--
-- Resolve the org from team_members instead, which is the same source the app
-- uses when it restores a session. This fixes existing accounts with no data
-- migration. A delete policy is added too - there was none, so removing a file
-- failed the same way.

drop policy if exists "auth_tenant_read" on storage.objects;
drop policy if exists "auth_tenant_write" on storage.objects;
drop policy if exists "auth_tenant_update" on storage.objects;
drop policy if exists "auth_tenant_delete" on storage.objects;

-- The org codes the signed-in user belongs to. STABLE so Postgres can cache it
-- per statement instead of re-running it for every object.
create or replace function public.user_org_codes()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select org_code
  from public.team_members
  where supabase_user_id = auth.uid()
    and coalesce(active, true)
$$;

grant execute on function public.user_org_codes() to authenticated;

create policy "auth_tenant_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] in (select public.user_org_codes())
  );

create policy "auth_tenant_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] in (select public.user_org_codes())
  );

create policy "auth_tenant_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] in (select public.user_org_codes())
  )
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] in (select public.user_org_codes())
  );

create policy "auth_tenant_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] in (select public.user_org_codes())
  );
