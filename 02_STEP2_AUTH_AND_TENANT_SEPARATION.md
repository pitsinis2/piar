# Step 2 — Auth and Tenant Separation

**Project:** ProjectManagerWeb (`saas-app`)  
**Supabase project:** PiAR — `ivdszujgmhpkebdgwoav`  
**Goal:** Replace localStorage user state with Supabase Auth; add org code + username + PIN login; tenant-scoped RLS on all tables.

---

## 0. Why this matters

Today, login doesn't exist. State is all localStorage, single-browser, no multi-user, no tenant isolation.

After Step 2:
- Real login with Org Code + Username + PIN
- Supabase Auth session (JWT with custom claims)
- `tenant_id` (org code) in JWT so RLS works
- Every table query automatically filtered by org
- No accidental data leak between orgs (the bug on OpexMM)

---

## 1. Database Schema

### 1.1 org_codes table

```sql
create table org_codes (
  org_code text primary key,
  name text not null,
  max_active_users integer default 5,
  created_at timestamptz default now()
);

comment on table org_codes is 'Tenants/organizations. Org code is the primary key and never changes.';
comment on column org_codes.org_code is 'Format: P12345678 (P + 8 digits). Must match getTenantId() return value.';
comment on column org_codes.max_active_users is 'Manual license limit for first customers. Step 2 logic only. Step 4+ will automate.';

-- Seed a dev org for testing
insert into org_codes (org_code, name, max_active_users) values ('00000000', 'Dev Org', 999) on conflict do nothing;
```

### 1.2 team_members table

```sql
create table team_members (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  supabase_user_id uuid references auth.users(id) on delete cascade,
  username text not null,
  email text,
  active boolean default true,
  role text default 'worker' check (role in ('admin', 'worker')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Enforce unique username per org, not globally
  unique(org_code, username)
);

comment on table team_members is 'Team members belong to orgs. Multiple members per org; one supabase_user_id per member.';
comment on column team_members.username is 'Unique within org. NOT the Supabase email. Used in login UI.';
comment on column team_members.email is 'Optional; can differ from synthetic Supabase email.';
comment on column team_members.role is 'admin: can manage org/users/licenses. worker: upload/view only.';
```

### 1.3 RLS Policies

**Enable RLS on both tables (should already be on):**

```sql
alter table org_codes enable row level security;
alter table team_members enable row level security;
```

**org_codes policies:**

```sql
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
```

**team_members policies:**

```sql
-- Users can see team members in their own org
create policy "team_members_read_own_org"
  on team_members for select
  to authenticated
  using (org_code = auth.jwt() ->> 'org_code');
  
-- Anon can read to display login error messages (e.g. "user exists")
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
      select 1 from team_members
      where org_code = team_members.org_code
        and supabase_user_id = auth.uid()
        and role = 'admin'
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
```

---

## 2. Auth Flow: Login

### 2.1 Login UI

Replace the current "Admin (Admin)" demo state with a real login form in `appback.js`.

**New login form (replaces demo user dropdown):**

```html
<div id="login-form-container">
  <h2>Project Manager Login</h2>
  <form id="loginForm">
    <label>
      Org Code
      <input type="text" id="orgCode" placeholder="P12345678" required />
    </label>
    <label>
      Username
      <input type="text" id="username" placeholder="your username" required />
    </label>
    <label>
      PIN
      <input type="password" id="pin" placeholder="6-digit PIN" maxlength="6" required />
    </label>
    <button type="submit">Login</button>
  </form>
  <div id="loginError" style="color: red;"></div>
</div>
```

### 2.2 Login Function

Add to `appback.js` (near existing auth/session functions):

```js
async function loginWithOrgCodeAndPin(orgCode, username, pin) {
  // Validate format
  if (!/^P\d{8}$/.test(orgCode)) {
    throw new Error("Org code must be format P12345678");
  }
  if (!/^\d{6}$/.test(pin)) {
    throw new Error("PIN must be 6 digits");
  }

  // Synthetic email: username@orgcode.internal
  const syntheticEmail = `${username}@${orgCode.toLowerCase()}.internal`;
  
  try {
    // Step A: Sign in to Supabase Auth (PIN is the password)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: pin,
    });
    
    if (error) throw error;
    
    // Step B: Verify org code and username match
    const user = data.user;
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('org_code', orgCode)
      .eq('username', username)
      .eq('supabase_user_id', user.id)
      .single();
    
    if (memberError || !member) {
      await supabase.auth.signOut(); // invalidate bad session
      throw new Error("Member not found or org code mismatch");
    }
    
    // Step C: Load user state
    state.currentUserId = user.id;
    state.currentUsername = member.username;
    state.currentOrgCode = orgCode;
    state.currentRole = member.role;
    state.isLoggedIn = true;
    
    persist();
    render();
    
    return { user, member };
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
}

async function logout() {
  await supabase.auth.signOut();
  state.currentUserId = null;
  state.currentUsername = null;
  state.currentOrgCode = null;
  state.currentRole = null;
  state.isLoggedIn = false;
  persist();
  render();
}

function getCurrentSession() {
  const session = supabase.auth.getSession();
  return session?.data?.session || null;
}
```

### 2.3 Update getTenantId()

Replace the hardcoded `00000000` in `supabase-client.js`:

```js
// Step 2 replaces this with org_code from the session
export function getTenantId() {
  const session = typeof window !== 'undefined' 
    ? window.supabase.auth.getSession?.()?.data?.session 
    : null;
  
  const orgCode = session?.user?.user_metadata?.org_code
    || (typeof state !== 'undefined' ? state.currentOrgCode : null);
  
  if (!orgCode) {
    console.warn("No org_code in session; using dev default");
    return "00000000";
  }
  
  // CRITICAL: Never strip the prefix. That bug caused a tenant leak on OpexMM.
  return orgCode;
}
```

---

## 3. Signup Flow (Optional for Step 2)

For now, signup is **admin-only** — an existing admin adds new members:

```js
async function signupNewMember(orgCode, username, email, tempPin) {
  // Only org admin can call this
  if (state.currentRole !== 'admin') {
    throw new Error("Only admins can add members");
  }

  const syntheticEmail = `${username}@${orgCode.toLowerCase()}.internal`;
  
  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: syntheticEmail,
    password: tempPin,
    email_confirm: true, // auto-confirm in dev
    user_metadata: { org_code: orgCode, username },
  });
  
  if (authError) throw authError;
  
  // Create team_members record
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .insert({
      org_code: orgCode,
      supabase_user_id: authData.user.id,
      username,
      email,
      role: 'worker',
    })
    .select()
    .single();
  
  if (memberError) throw memberError;
  
  return { user: authData.user, member };
}
```

---

## 4. Storage Policy Update

**Close the dev anon read/write policies from Step 1.**

The `project-files` bucket should now only allow authenticated requests. Replace the dev policies:

```sql
-- REMOVE these old dev policies
drop policy if exists "dev_anon_read" on storage.objects;
drop policy if exists "dev_anon_write" on storage.objects;
drop policy if exists "dev_anon_update" on storage.objects;

-- NEW: Only authenticated users in their own org
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
```

This ensures storage paths like `P12345678/project-123/file.jpg` are only readable by users in org `P12345678`.

---

## 5. Frontend State Changes

Add to global `state` object in `appback.js`:

```js
let state = {
  // ... existing project/area/note state ...
  
  // Auth state (new)
  isLoggedIn: false,
  currentUserId: null,
  currentUsername: null,
  currentOrgCode: null,
  currentRole: 'worker', // 'admin' or 'worker'
};
```

---

## 6. Test Plan

### 6.1 Prerequisites

1. Run the migrations from section 1 in Supabase SQL Editor
2. Update Supabase Auth settings: allow signups (for now; can restrict later)
3. Confirm RLS is enabled on both tables

### 6.2 Tests

**Test 1: Signup new admin (manual, one-time)**
```
- Go to Supabase → Authentication → Create user
- Email: admin@p12345678.internal
- Password: 123456
- Go to team_members, insert:
  - org_code: P12345678
  - supabase_user_id: (the user ID from above)
  - username: admin
  - role: admin
```

**Test 2: Login flow**
```
- Open app
- Enter: Org Code = P12345678, Username = admin, PIN = 123456
- Should succeed, currentOrgCode should be P12345678
- Verify getTenantId() returns P12345678 (not stripped)
```

**Test 3: Org isolation (RLS)**
```
- While logged in as P12345678, try to query team_members:
  const { data } = await supabase.from('team_members').select('*');
  // Should only return members from P12345678, not other orgs
```

**Test 4: Add new worker (admin-only)**
```
- As admin, call signupNewMember('P12345678', 'worker1', 'worker1@example.com', '654321')
- New member should appear in team_members
- New member should be able to login with username=worker1, pin=654321
```

**Test 5: Storage isolation**
```
- Upload a photo as org P12345678
- Should land in: supabase/project-files/P12345678/...
- Create another org P99999999 somehow
- Try to read P12345678's photos as P99999999
- Should be denied (RLS on storage path)
```

**Test 6: Logout**
```
- While logged in, call logout()
- currentUserId should be null
- state.isLoggedIn should be false
- Should redirect to login form
```

**Test 7: Session persistence (reload)**
```
- Login successfully
- Reload page (F5)
- supabase.auth.getSession() should restore session
- App should auto-populate currentUserId, currentOrgCode from JWT
- No re-login needed
```

---

## 7. Security Checkpoints

Before considering Step 2 done:

- [ ] `getTenantId()` never strips org code prefix
- [ ] RLS is enabled on org_codes and team_members
- [ ] All RLS policies reference `auth.jwt() ->> 'org_code'` (not just `state.currentOrgCode`)
- [ ] Storage policies only allow org-scoped reads (path prefix match)
- [ ] PINs are hashed by Supabase Auth (not stored plain)
- [ ] Synthetic emails are unguessable (org code + username, not predictable)
- [ ] Dev policy (dev_anon_read/write) is removed from storage before real data upload
- [ ] Signup is admin-only (no self-signup form without approval)

---

## 8. Done Criteria

Step 2 is complete when:

1. ✓ Org code + username + PIN login works
2. ✓ Sessions persist across reload
3. ✓ RLS blocks cross-org queries
4. ✓ Storage paths are org-scoped
5. ✓ Logout clears session
6. ✓ New team members can be added by admin
7. ✓ All test plan checks pass
8. ✓ No real customer data in bucket yet (dev org only)

After Step 2, Step 3 moves projects/areas/notes/tasks from localStorage into Postgres tables with org_code on every row.

---

## 9. Guardrails

- Do NOT skip RLS setup to "make it work faster" — debt from OpexMM
- Do NOT create a separate users table and duplicate Supabase Auth — use Supabase's user_metadata instead
- Do NOT hardcode org codes in tests — use the dev org P00000000
- Do NOT remove dev_anon policies until storage has RLS policies in place
- Before Step 3 starts, back up the current localStorage state
