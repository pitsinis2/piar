# ProjectManagerWeb — Production Deployment Guide

**Estimated Time:** 3-4 hours  
**Difficulty:** Intermediate (copy/paste URLs, clicks, environment variables)  
**Prerequisites:** GitHub account, Google account, credit card (Supabase free tier, no charges)

---

## Phase 1: Supabase Setup (15 minutes)

### Step 1.1: Create Supabase Project

1. Go to https://supabase.com
2. Sign in (create account if needed)
3. Click **"New Project"**
4. Fill in:
   - **Project Name:** `projectmanagerweb` (or your choice)
   - **Password:** Generate strong password (save it)
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
5. Click **"Create new project"** (wait 2-3 minutes for setup)

### Step 1.2: Get Your Credentials

Once project is created:

1. Click **"Settings"** (bottom left)
2. Click **"API"** (left sidebar)
3. Copy these:
   - **Project URL** → Save as `VITE_SUPABASE_URL`
   - **Anon Key** → Save as `VITE_SUPABASE_ANON_KEY`

4. Click **"Database"** (left sidebar)
5. Click **"Passwords"**
6. Copy **Service Role Key** → Save as `SUPABASE_SERVICE_ROLE_KEY`

**Example (YOUR VALUES WILL BE DIFFERENT):**
```
VITE_SUPABASE_URL=https://qwerty-abcd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Phase 2: Google Cloud Setup (15 minutes)

### Step 2.1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Sign in with your Google account
3. At top, click **"Select a Project"** → **"NEW PROJECT"**
4. Name: `ProjectManagerWeb` or `Google Drive Backup`
5. Click **"Create"** (wait 30 seconds)

### Step 2.2: Enable Google Drive API

1. In search bar at top, type: `Google Drive API`
2. Click **"Google Drive API"** in results
3. Click blue **"Enable"** button
4. Wait for confirmation

### Step 2.3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials** (left sidebar)
2. Click **"+ CREATE CREDENTIALS"** (top)
3. Choose **"OAuth client ID"**
4. If prompted: **"Configure OAuth Consent Screen"** first
   - Choose **"External"** user type
   - Click **"Create"**
   - Fill in:
     - App name: `ProjectManagerWeb`
     - User support email: your email
     - Developer contact: your email
   - Click **"Save and Continue"**
   - Click **"Save and Continue"** (Scopes page)
   - Click **"Back to Dashboard"**

5. Back to Credentials, click **"+ CREATE CREDENTIALS"** again
6. Choose **"OAuth client ID"**
7. Application type: **"Web application"**
8. Name: `ProjectManagerWeb`
9. Under **"Authorized redirect URIs"**, click **"ADD URI"**
10. Enter: `http://localhost:5173/auth/google/callback` (for development)
11. Click **"Create"**

### Step 2.4: Get Your Credentials

After OAuth ID created, you'll see a popup with:
- **Client ID** → Save as `VITE_GOOGLE_CLIENT_ID`
- **Client Secret** → Save as `GOOGLE_OAUTH_CLIENT_SECRET`

(If popup closes, go to Credentials page, find your OAuth 2.0 Client ID, click it to see credentials)

---

## Phase 3: Configure Environment Variables (5 minutes)

### Step 3.1: Update .env File

Open `C:\Users\pitsi\Documents\Programming\ProjectManagerWeb\.env`

Replace placeholders with your actual values:

```bash
# Supabase (from Phase 1)
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (from Phase 2)
VITE_GOOGLE_CLIENT_ID=1234567890-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuv
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

**⚠️ Important:** Never commit `.env` file to git (it's already in `.gitignore`)

### Step 3.2: Verify Supabase Connection

Open terminal, run:
```bash
npm install  # Install dependencies if needed
npm run dev  # Start dev server
```

Visit `http://localhost:5173`
- Try login with: `P00000000` / `admin` / `123456`
- Should see projects page
- If error: Check `.env` values

---

## Phase 4: Deploy Edge Functions (20 minutes)

### Step 4.1: Install Supabase CLI

```bash
# Install Supabase CLI (one time)
npm install -g supabase
```

### Step 4.2: Link Project to Local CLI

```bash
cd C:\Users\pitsi\Documents\Programming\ProjectManagerWeb

supabase link --project-ref YOUR-PROJECT-ID
# When prompted for password, enter the password you created in Step 1.1
```

Find `YOUR-PROJECT-ID` in Supabase dashboard URL: `https://app.supabase.com/project/YOUR-PROJECT-ID`

### Step 4.3: Deploy Edge Functions

```bash
# Deploy Google OAuth callback function
supabase functions deploy google-oauth-callback

# Deploy backup upload function
supabase functions deploy backup-upload

# Deploy client portal data function
supabase functions deploy client-portal-data

# Deploy project shares management function
supabase functions deploy project-shares
```

After each deploy, you should see:
```
✓ Function deployed successfully
  URL: https://YOUR-PROJECT-ID.supabase.co/functions/v1/FUNCTION-NAME
```

### Step 4.4: Verify Edge Functions

1. Go to Supabase dashboard
2. Click **"Edge Functions"** (left sidebar)
3. Should see 4 functions:
   - `google-oauth-callback`
   - `backup-upload`
   - `client-portal-data`
   - `project-shares`

All should show **"Active"** status.

---

## Phase 5: Run Database Migrations (10 minutes)

### Step 5.1: Apply Migrations

```bash
cd C:\Users\pitsi\Documents\Programming\ProjectManagerWeb

# Push migrations to Supabase
supabase db push
```

This will:
- Create `backup_history` table
- Create `project_shares` table
- Add `show_on_client_portal` column to `team_members`
- Add RLS policies

You should see:
```
✓ Applied migration [timestamp]_data_into_postgres.sql
✓ Applied migration [timestamp]_backup_history.sql
✓ Applied migration [timestamp]_client_portal.sql
```

### Step 5.2: Verify in Supabase Dashboard

1. Go to Supabase dashboard
2. Click **"SQL Editor"** (left sidebar)
3. Click **"New query"**
4. Run:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```
5. Should see tables including:
   - `backup_history`
   - `project_shares`
   - `projects`, `areas`, `notes`, `tasks`

---

## Phase 6: Test End-to-End (1 hour)

### Test 6.1: Team Login + Project Data

1. Keep dev server running: `npm run dev`
2. Visit `http://localhost:5173`
3. Login with: `P00000000` / `admin` / `123456`
4. ✅ Should see "Projects" page
5. ✅ Should see 0 projects initially
6. Try creating a project (fill form, click Save)
7. ✅ Project should appear in list (saved to Postgres)
8. Reload page (F5)
9. ✅ Project should still be there (data persisted)

### Test 6.2: Logout

1. Click menu (top right)
2. Click "Logout"
3. ✅ Should see login form again
4. Login again with same credentials
5. ✅ Same data still there

### Test 6.3: Backup Connection (if you want to test)

1. Click menu (top right)
2. Click "🔗 Connect Google Drive"
3. ✅ Should open Google login popup
4. Login with your Google account
5. Grant permission
6. ✅ Should return to app, popup closes
7. "Connect" button → "Backup Now" button
8. (Don't actually backup yet - needs real Google setup)

### Test 6.4: Client Portal

1. In new incognito window, visit: `http://localhost:5173/client-portal-test.html`
2. ✅ Should see "Kitchen Remodel" project
3. ✅ Photos should show (mock SVG images)
4. ✅ Click "Punch List" tab
5. ✅ Should see open issues with photos
6. ✅ Click "Team" tab
7. ✅ Should see John Smith + Maria Rodriguez with contact info
8. ✅ Check responsive: Open DevTools (F12), set width to 375px (mobile)
9. ✅ Layout should still work

### Test 6.5: Create Test Data

1. Back to main app (logout/login if needed)
2. Create a project: "Test Kitchen"
3. Add area: "Kitchen"
4. Add note: "Cabinets installed" with `show_on_master_plan = true`
5. Go to project details
6. *(Team UI for share links not built yet, so skip generating actual share)*
7. ✅ Verify data in Supabase:
   ```bash
   supabase db push --dry-run
   ```

---

## Phase 7: Prepare for Production Deployment (30 minutes)

### Step 7.1: Add Production Environment

For production, you'll eventually need:

**Production `.env.production`** (or configure in hosting platform):
```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
VITE_GOOGLE_CLIENT_ID=[client-id]
GOOGLE_OAUTH_CLIENT_SECRET=[client-secret]
GOOGLE_OAUTH_REDIRECT_URI=https://yourdomain.com/auth/google/callback
```

**Update Google OAuth redirect URI for production:**
1. Go to Google Cloud Console
2. Credentials → OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://yourdomain.com/auth/google/callback`
4. Save

### Step 7.2: Choose Hosting Platform

**Recommended options:**
- **Vercel** (Easiest, $20/mo) - Deploy Next.js style, auto-scales
- **Netlify** (Easy, Free - $20/mo) - Drag & drop deployment
- **AWS Amplify** (More control, Free tier available)
- **Railway** (Simple, Pay-as-you-go, $5/mo starting)

For this project (Vite + Supabase):
1. Push code to GitHub
2. Connect GitHub to Vercel/Netlify
3. Add `.env` variables in platform settings
4. Deploy (automatic on every push)

### Step 7.3: Deployment Checklist

- [ ] Production Supabase project created
- [ ] Environment variables configured
- [ ] Edge Functions deployed to production
- [ ] Database migrations applied
- [ ] Google OAuth redirect URI updated
- [ ] GitHub repo pushed (with .env excluded)
- [ ] Hosting platform connected
- [ ] Test login on production
- [ ] Test backup flow on production
- [ ] Test client portal on production
- [ ] Set up monitoring/error tracking

---

## Troubleshooting

### "Connection refused to Supabase"
**Fix:** Check `.env` values match Supabase dashboard. Try:
```bash
npm run dev  # Restart dev server
```

### "Invalid API Key"
**Fix:** Verify `VITE_SUPABASE_ANON_KEY` is correct (should be long alphanumeric string starting with `eyJ...`)

### "Google OAuth button shows 'not configured'"
**Fix:** Verify `VITE_GOOGLE_CLIENT_ID` in `.env`. Should look like: `1234567890-abcdefgh.apps.googleusercontent.com`

### "Edge Function deployment fails"
**Fix:** 
```bash
supabase link --project-ref YOUR-PROJECT-ID  # Re-link
supabase functions deploy backup-upload --no-verify  # Skip type checks
```

### "Backup fails with 'unauthorized'"
**Fix:** Verify:
1. Google OAuth redirect URI includes development URL
2. GOOGLE_OAUTH_CLIENT_SECRET is correct (not Client ID)

### "Client portal blank page"
**Fix:** Open DevTools (F12), check Console tab for errors. If it says "failed to fetch", Edge Function isn't deployed or has wrong name.

---

## Support

**If something breaks:**
1. Check console errors (F12)
2. Check `.env` values
3. Run `npm run dev` to see server logs
4. Check Supabase dashboard for function/database errors

**Common issues documented in PROJECT_STATUS.md**

---

## Success! 🎉

After all phases complete:
- ✅ Contractors can login and manage projects
- ✅ Data persists in Postgres (not localStorage)
- ✅ Backup to Google Drive (one click)
- ✅ Client portal (share links with customers)
- ✅ Full multi-tenant SaaS running

**Next steps:**
1. Have contractors create real projects
2. Test backup flow with real Google account
3. Share test link with a client
4. Gather feedback
5. Phase 2: Add features based on feedback

---

## Timeline

| Task | Time | Status |
|------|------|--------|
| Supabase setup | 15 min | ▶️ Do now |
| Google Cloud setup | 15 min | ▶️ Do now |
| Configure .env | 5 min | ▶️ Do now |
| Deploy Edge Functions | 20 min | ▶️ Do now |
| Run migrations | 10 min | ▶️ Do now |
| Test end-to-end | 60 min | ▶️ Do now |
| **Total** | **~2 hours** | ✅ Today |

After this: Live SaaS in production! 🚀

---

**Last Updated:** 2026-08-18  
**For:** Full deployment checklist, see `PROJECT_STATUS.md`
