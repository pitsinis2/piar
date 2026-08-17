# Step 4 — Daily Backup to Google Drive

**Project:** ProjectManagerWeb (`saas-app`)  
**Supabase project:** PiAR — `ivdszujgmhpkebdgwoav`  
**Goal:** Implement daily automated and manual backup of org data to user's personal Google Drive.

---

## 0. Why this matters

Today, data lives only in Postgres. A database outage, accidental deletion, or data corruption could be catastrophic for users.

After Step 4:
- Admin can click "Backup Now" to export org data to their Google Drive
- Daily automatic backup runs at scheduled time (admin configurable)
- Each org's backups are isolated to that org's Google Drive
- Backup includes: projects, areas, notes, tasks, team_members, photos metadata
- User can restore from backup later (Phase 2)

---

## 1. Google OAuth Setup (One-time)

### 1.1 Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "ProjectManagerWeb Backup"
3. Enable APIs:
   - Google Drive API
   - Google OAuth 2.0
4. Create OAuth 2.0 credential (Web application):
   - **Application type:** Web application
   - **Name:** ProjectManagerWeb Backup
   - **Authorized redirect URIs:**
     - `http://localhost:5173/auth/google/callback` (dev)
     - `https://your-domain.com/auth/google/callback` (production)
5. Copy **Client ID** and **Client Secret**

### 1.2 Store Credentials

Add to `saas-app/.env`:
```
VITE_GOOGLE_CLIENT_ID=<your-client-id>
VITE_GOOGLE_BACKUP_FOLDER=ProjectManagerWeb Backups
```

The **Client Secret** stays on the server (Node backend only), not in the browser.

---

## 2. Architecture

### 2.1 OAuth Flow

```
User clicks "Backup Now"
    ↓
Check if Google auth token exists
    ↓
NO → Redirect to Google login (popup or new tab)
YES → Skip to backup
    ↓
User grants permission to access Drive
    ↓
Google redirects back with auth code
    ↓
Exchange code for access token
    ↓
Store token (in session or Supabase user_metadata)
    ↓
Proceed with backup
```

### 2.2 Backup Data Structure

```
Google Drive Folder: "ProjectManagerWeb Backups"
├── {org_code}_{org_name} (folder)
│   ├── backup_2026-08-20_143022.json (full export)
│   ├── backup_2026-08-19_143022.json
│   └── backup_2026-08-18_143022.json
```

Each backup file contains:
```json
{
  "version": "3.0",
  "exportedAt": "2026-08-20T14:30:22Z",
  "orgCode": "P00000000",
  "orgName": "Demo Org",
  "data": {
    "projects": [...],
    "areas": [...],
    "notes": [...],
    "tasks": [...],
    "teamMembers": [...]
  },
  "stats": {
    "projectCount": 5,
    "noteCount": 42,
    "taskCount": 18,
    "sizeKB": 245
  }
}
```

---

## 3. Frontend Changes

### 3.1 Add backup button to UI

In `index.html`, add to the user menu (access-menu-panel):

```html
<button id="backup-btn" class="primary-btn" type="button" style="margin-top: 1em;">
  💾 Backup to Google Drive
</button>
<div id="backup-status" class="muted" style="font-size: 0.9em; margin-top: 0.5em;"></div>
```

### 3.2 Add backup handlers in appback.js

```javascript
// Step 4: Google Drive Backup

async function initiateGoogleAuth() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google OAuth not configured");
  }

  const scope = 'https://www.googleapis.com/auth/drive.file';
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('access_type', 'offline');
  
  // Open popup or redirect
  window.open(authUrl.toString(), 'google-auth', 'width=500,height=600');
}

async function backupOrgData() {
  if (!isLoggedIn || !currentOrgCode) {
    throw new Error("Must be logged in to backup");
  }

  showAppMessage("Preparing backup...", "info");

  try {
    // Fetch all org data from Postgres
    const [projects, areas, notes, tasks, members] = await Promise.all([
      supabase.from('projects').select('*').eq('org_code', currentOrgCode),
      supabase.from('areas').select('*').eq('org_code', currentOrgCode),
      supabase.from('notes').select('*').eq('org_code', currentOrgCode),
      supabase.from('tasks').select('*').eq('org_code', currentOrgCode),
      supabase.from('team_members').select('*').eq('org_code', currentOrgCode),
    ]);

    if (projects.error) throw projects.error;
    if (areas.error) throw areas.error;
    if (notes.error) throw notes.error;
    if (tasks.error) throw tasks.error;
    if (members.error) throw members.error;

    // Build backup object
    const backup = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      orgCode: currentOrgCode,
      data: {
        projects: projects.data || [],
        areas: areas.data || [],
        notes: notes.data || [],
        tasks: tasks.data || [],
        teamMembers: members.data || [],
      },
      stats: {
        projectCount: projects.data?.length || 0,
        areaCount: areas.data?.length || 0,
        noteCount: notes.data?.length || 0,
        taskCount: tasks.data?.length || 0,
        memberCount: members.data?.length || 0,
        sizeKB: Math.round(JSON.stringify(backup).length / 1024),
      }
    };

    // Send to backend for Google Drive upload
    const response = await fetch('/api/backup/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backup)
    });

    if (!response.ok) throw new Error(await response.text());

    const result = await response.json();
    showAppMessage(`Backup complete! ${result.sizeKB}KB uploaded to Google Drive.`, "success");
    
    // Update last backup timestamp
    state.lastBackupAt = new Date().toISOString();
    persist();
  } catch (error) {
    console.error("Backup failed:", error);
    showAppMessage("Backup failed: " + error.message, "error");
    throw error;
  }
}

// Wire up backup button
document.addEventListener('DOMContentLoaded', async function() {
  const backupBtn = document.getElementById('backup-btn');
  if (backupBtn) {
    backupBtn.addEventListener('click', async function() {
      try {
        await backupOrgData();
      } catch (error) {
        console.error("Backup error:", error);
      }
    });
  }
});
```

### 3.3 Handle OAuth callback

Add route handler for `/auth/google/callback`:

```javascript
// In appback.js or separate handler
window.addEventListener('message', async function(e) {
  if (e.data.type === 'GOOGLE_AUTH_SUCCESS') {
    const authCode = e.data.code;
    try {
      // Exchange code for token via backend
      const response = await fetch('/api/auth/google/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode })
      });
      const result = await response.json();
      if (result.success) {
        showAppMessage("Google Drive connected!", "success");
        // Trigger backup
        await backupOrgData();
      }
    } catch (error) {
      showAppMessage("Auth failed: " + error.message, "error");
    }
  }
});
```

---

## 4. Backend Changes (Node.js)

### 4.1 Google Drive API Integration

```javascript
// backend/routes/backup.js
const { google } = require('googleapis');
const drive = google.drive('v3');

async function uploadBackupToGoogleDrive(backup, accessToken, orgName) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });

  try {
    // Ensure backup folder exists
    const folderName = `ProjectManagerWeb Backups/${backup.orgCode}_${orgName}`;
    let folderId = await findOrCreateFolder(auth, folderName);

    // Create backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${timestamp}.json`;
    
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json',
    };

    const response = await drive.files.create(
      {
        auth,
        resource: fileMetadata,
        media: {
          mimeType: 'application/json',
          body: JSON.stringify(backup, null, 2),
        },
      },
      { maxRedirects: 0 }
    );

    return {
      success: true,
      fileId: response.data.id,
      fileName: fileName,
      sizeKB: Math.round(JSON.stringify(backup).length / 1024),
    };
  } catch (error) {
    console.error("Google Drive upload failed:", error);
    throw error;
  }
}

async function findOrCreateFolder(auth, folderPath) {
  // Implementation: search for folder, create if missing
  // Return folder ID
}

// Express route
app.post('/api/backup/upload', authenticateUser, async (req, res) => {
  const backup = req.body;
  const accessToken = req.user.googleAccessToken;

  if (!accessToken) {
    return res.status(401).json({ error: 'Google Drive not connected' });
  }

  try {
    const result = await uploadBackupToGoogleDrive(
      backup,
      accessToken,
      req.user.orgName
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth exchange route
app.post('/api/auth/google/exchange', async (req, res) => {
  const { code } = req.body;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.VITE_APP_URL}/auth/google/callback`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    // Store token in Supabase user_metadata or session
    res.json({ success: true, accessToken: tokens.access_token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## 5. Database Changes

### 5.1 Track backup history (optional)

Add to Postgres:

```sql
create table if not exists backup_history (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  backup_file_id text not null,  -- Google Drive file ID
  backup_file_name text not null,
  backup_size_kb int,
  created_at timestamptz default now(),
  created_by_user_id uuid not null references team_members(supabase_user_id),
  notes text
);

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

grant select, insert on public.backup_history to authenticated;
```

---

## 6. Test Plan

### 6.1 Prerequisites

1. Google OAuth app set up (Client ID/Secret)
2. `.env` configured with `VITE_GOOGLE_CLIENT_ID`
3. Backend running (Node.js server)
4. User logged in to app

### 6.2 Tests

**Test 1: Connect Google Drive**
```
- Click "Backup to Google Drive" button
- Redirected to Google login
- Grant permission
- Redirected back to app
- Success message: "Google Drive connected!"
```

**Test 2: Backup exports data**
```
- With Google Drive connected, click "Backup Now"
- Wait for "Backup complete!" message
- Open Google Drive in browser
- Verify folder: "ProjectManagerWeb Backups/P00000000_..."
- Verify backup_YYYY-MM-DD_HHMMSS.json file exists
- Download and verify JSON structure
```

**Test 3: Backup includes all data**
```
- Create 2 projects, 5 areas, 10 notes, 8 tasks
- Trigger backup
- Check backup JSON has correct counts
- Verify all fields present (org_code, timestamp, stats)
```

**Test 4: Org isolation**
```
- Login as User A (Org P00000000)
- Trigger backup
- Login as User B (different org)
- Trigger backup
- Verify each org's backups are in separate Google Drive folder
- Confirm User A cannot see User B's backups
```

**Test 5: Multiple backups**
```
- Trigger backup at time T1
- Wait 1 minute
- Modify project, trigger backup at T2
- Verify both backup files in Drive
- Verify T2 backup has new modification timestamp
```

---

## 7. Done Criteria

Step 4 is complete when:

1. ✅ Google OAuth credentials created and stored
2. ✅ User can click "Backup Now" button
3. ✅ User redirected to Google login on first backup
4. ✅ User grants permission and is redirected back
5. ✅ Backup file uploaded to user's Google Drive
6. ✅ Backup folder structure: `ProjectManagerWeb Backups/{org_code}_{org_name}/`
7. ✅ Backup JSON includes all org data + metadata
8. ✅ Success/error messages shown to user
9. ✅ Each org's backups isolated to that org's Drive
10. ✅ Backup history logged (optional)

---

## 8. After Step 4

- **Phase 2a:** Automatic daily backups (cron job)
- **Phase 2b:** Backup restore function (import from JSON)
- **Phase 2c:** Backup browser in app (list + download)
- **Step 5:** Client portal (view published subset of org data)

---

## 9. Environment Variables

Add to `.env` and `.env.production`:

```
VITE_GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_BACKUP_FOLDER=ProjectManagerWeb Backups
VITE_APP_URL=http://localhost:5173
```

Production:
```
VITE_APP_URL=https://your-domain.com
```

---

## 10. Security Notes

- **Client Secret** never exposed to browser (backend only)
- **Access tokens** stored securely (user_metadata or encrypted session)
- **Backups include full org data** — user must have admin role to trigger
- **Google Drive scope:** `drive.file` (app can only access files it created)
- **RLS enforced:** Only team members of org can trigger backup
