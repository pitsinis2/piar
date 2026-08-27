# Step 5 — Production-Ready Client Portal

**Project:** ProjectManagerWeb  
**Goal:** Lightweight, read-only client interface to view project status, progress, budget, and punch lists. Zero complexity, maximum value.

---

## Executive Summary

After login, contractors share a **secure client portal link** with their clients. Clients see:
- **Project Overview** — status, timeline, budget
- **Progress Photos** — timestamped galleries per area
- **Punch List** — open/closed issues, photos
- **Budget Tracking** — spend vs. estimate (if enabled)
- **Project Team Contact** — who to call/email

**What clients CANNOT see:**
- Internal team notes
- Other projects
- Employee rates/costs
- Internal schedules

---

## Architecture

### Two-URL Strategy

| URL | Audience | Auth | Features |
|-----|----------|------|----------|
| `/app` | Team (Contractor) | Supabase Auth | Full CRUD, all data |
| `/client/{token}` | Client (Customer) | Share link token | Read-only, view-only |

**Why separate URLs?**
- Simpler permission model (no RLS role bloat)
- Cleaner UI/UX per audience
- Easier to deprecate without affecting team
- Can serve from same backend or separate

**Share Link Token:**
- UUID format: `client-{uuid}`
- Stored in Postgres `project_shares` table
- Can be revoked, expires, or permanent
- One token per client per project (or per client per org)

---

## Database Schema

### New Table: `project_shares`

```sql
create table if not exists project_shares (
  id uuid primary key default gen_random_uuid(),
  org_code text not null references org_codes(org_code) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  share_token text not null unique,
  client_id uuid references clients(id) on delete set null,
  client_name text,
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
```

**Why this schema:**
- One share per client per project (org_code + project_id uniqueness)
- Revocation via `is_active` (no deletion, audit trail stays)
- Expiry optional (permanent shares OK for long projects)
- Access tracking (support sees if client opened link)
- Client info stored (don't rely on email being current)

### Data Visibility Rules

Client sees only:
- **projects** — only the shared project
- **areas** — only areas in that project
- **notes** — only notes with `show_on_master_plan = true` OR created_by the team member sharing
- **photos/attachments** — linked to notes client can see
- **tasks** — NOT visible (internal only)
- **team_members** — only if `show_on_client_portal = true`

---

## UI/UX Design

### Client Portal Layout

```
┌─────────────────────────────────────────────┐
│ Project Title                         [Menu]│
│ Timeline: Jan 20 - Feb 15 (75% done)       │
├─────────────────────────────────────────────┤
│ Progress     │  Budget      │  Team         │
│ ████░░░░ 75% │ $45K / $50K  │ John Plumber  │
│              │ (On budget)  │ john@...      │
├─────────────────────────────────────────────┤
│ [Gallery]  [Punch List]  [Timeline]         │
├─────────────────────────────────────────────┤
│ Gallery Section:                            │
│  [Kitchen]  [Bathroom]  [Hallway]           │
│   • 12 photos                               │
│                                             │
│ [Kitchen Photo Carousel]                    │
│ Photo from Feb 8, 2026                      │
│ "Kitchen cabinets installed"                │
└─────────────────────────────────────────────┘
```

**Mobile-first responsive design** (clients view on site via phone)

### Key Sections

#### 1. Project Header
- Title, address, timeline
- Progress bar (% complete)
- Status badge (Active, Paused, Completed)
- Estimated vs actual dates
- One-line team contact info

#### 2. Progress Gallery
- Photos grouped by area (Kitchen, Bathroom, etc)
- Sorted by date descending
- Timestamp, caption (from note title)
- Click to expand/lightbox

#### 3. Punch List
- Open issues only (status != 'done')
- Title, location (area name)
- Photos if attached
- "Mark as Resolved" button (?)
  - Design decision: read-only or allow client comments?
  - MVP: read-only only

#### 4. Budget Summary (Optional)
- If client enabled `show_budget = true`
- Spent vs budget (visual bar)
- Line items (materials, labor - if desired)
- Variance explanation

#### 5. Team Contact
- Photo (optional)
- Name, role
- Phone, email
- "Message on Viber/WhatsApp" links

---

## Implementation Plan

### Phase 1 (MVP - This Session)

**Frontend:** `public/client-portal/index.html`
- Single-page app (no routing needed)
- Fetch project data via API using share token
- Render sections based on available data
- Mobile responsive CSS
- No login required (token is auth)

**Backend:** New API endpoint
```
GET /api/v1/client-portal/{token}
  Returns: project, areas, notes (filtered), photos metadata
  No auth header needed (token is auth)
  Rate-limited by IP
```

**Database:**
- Create `project_shares` table
- Add `show_on_client_portal` column to team_members (bool, default false)
- (Don't add `show_budget` yet - Phase 2)

**Team UI (in main app):**
- Button to generate/manage share links in project details
- Copy link to clipboard
- Revoke link
- See access stats

---

## API Endpoints

### Get Client Portal Data

```http
GET /api/v1/client-portal/{shareToken}
Authorization: none (token is sufficient)

Response:
{
  "project": {
    "id": "uuid",
    "name": "Kitchen Remodel",
    "address": "123 Main St",
    "startDate": "2026-01-20",
    "endDate": "2026-02-15",
    "status": "active",
    "completionPercent": 75
  },
  "areas": [
    {
      "id": "uuid",
      "name": "Kitchen",
      "photoCount": 12
    }
  ],
  "notes": [
    {
      "id": "uuid",
      "title": "Kitchen cabinets installed",
      "content": "All cabinets in place, hardware next",
      "createdAt": "2026-02-08T10:30:00Z",
      "photos": ["photo-id-1", "photo-id-2"]
    }
  ],
  "team": [
    {
      "id": "uuid",
      "name": "John Plumber",
      "role": "Lead",
      "email": "john@...",
      "phone": "+1-555-1234"
    }
  ]
}
```

### Generate Share Link

```http
POST /api/v1/projects/{projectId}/shares
Authorization: Bearer {supabaseToken}
Content-Type: application/json

{
  "clientName": "Homeowner",
  "clientEmail": "client@...",
  "expiresIn": 90  // days, optional
}

Response:
{
  "shareToken": "client-uuid",
  "shareUrl": "https://projectmanagerweb.com/client/client-uuid",
  "createdAt": "...",
  "expiresAt": "..." // if set
}
```

### Revoke Share Link

```http
DELETE /api/v1/projects/{projectId}/shares/{shareToken}
Authorization: Bearer {supabaseToken}

Response: { "success": true }
```

---

## Frontend Implementation

### File: `public/client-portal/index.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Project Portal</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <div id="loading">Loading project...</div>
    <div id="error" style="display:none;"></div>
    <div id="content" style="display:none;">
      <!-- Project header -->
      <header id="project-header"></header>
      
      <!-- Tab navigation -->
      <nav id="tabs">
        <button class="tab-btn active" data-tab="gallery">Gallery</button>
        <button class="tab-btn" data-tab="punch-list">Punch List</button>
        <button class="tab-btn" data-tab="team">Team</button>
      </nav>
      
      <!-- Tab content -->
      <div id="gallery" class="tab-content active"></div>
      <div id="punch-list" class="tab-content"></div>
      <div id="team" class="tab-content"></div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

### File: `public/client-portal/app.js`

```javascript
// Extract share token from URL
const shareToken = window.location.pathname.split('/').pop();

// Fetch project data
async function loadPortal() {
  try {
    const response = await fetch(`/api/v1/client-portal/${shareToken}`);
    if (!response.ok) throw new Error('Project not found or link expired');
    
    const data = await response.json();
    renderPortal(data);
  } catch (error) {
    showError(error.message);
  }
}

function renderPortal(data) {
  // Render header with project info
  // Render gallery with photos per area
  // Render punch list with open notes
  // Render team contacts
  // Wire up tab switching
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadPortal);
```

---

## Share Link UI (Main App)

**In project details panel, add "Share with Client" button:**

1. Click button → modal opens
2. Enter client name + email
3. Set expiry (optional, default: never)
4. Click "Generate Link"
5. Show link with "Copy to Clipboard" button
6. Show QR code option (Phase 2)
7. List active shares, revoke option

---

## Security Model

### Token-Based Auth (No DB query per request)

**Option A: Stateless JWT (Preferred)**
```
Token = JWT signed with secret { projectId, expires }
Client: GET /client/{token}
Backend: Verify JWT sig → extract projectId → fetch project data
Pro: Scalable, no DB lookup
Con: Can't revoke without blacklist
```

**Option B: Database Lookup (Safer revocation)**
```
Token = UUID in project_shares table
Client: GET /client/{token}
Backend: SELECT * FROM project_shares WHERE share_token = token
Pro: Can revoke instantly via is_active flag
Con: One DB query per request (still fast with index)
```

**Recommendation: Option B** for MVP (easier revocation = better support experience)

### Rate Limiting

- Limit by IP: 100 requests / 5 min per share link
- Prevents brute-force token guessing
- Prevents photo scraping (future: image download limits)

### No User Data Leakage

- Share link reveals only: project name, photos, areas, team names (if enabled)
- No costs, rates, internal notes, other projects
- No access to Supabase UI/API
- No way to brute-force other tokens (UUIDs = 122 bits entropy)

---

## Done Criteria

✅ **Functional:**
- Client can open share link
- See project title, status, timeline
- View photos organized by area
- See punch list (open issues)
- View team contact info
- Mobile responsive

✅ **Reliable:**
- Invalid/expired links show friendly error
- Works offline (photos cached, but need internet to load initially)
- Rate limited against abuse

✅ **Supportable:**
- Team can see link access stats (last accessed, count)
- Team can revoke links easily
- No support overhead (read-only, no state changes)

✅ **Secure:**
- RLS prevents data leakage (DB enforced)
- Share tokens are UUIDs (unguessable)
- Rate limiting prevents scraping
- No credentials exposed in URLs

---

## Test Plan

- [ ] Generate share link from project details
- [ ] Copy link, open in incognito (no auth)
- [ ] See project details (name, dates, progress)
- [ ] View photos per area
- [ ] See punch list items
- [ ] View team contact info
- [ ] Click team email/phone (links work)
- [ ] Mobile view responsive
- [ ] Revoke link, try to open (shows error)
- [ ] Expired link (set expires_at = now - 1 day, try to open)
- [ ] Rate limiting works (hammer endpoint, get 429)

---

## Support Procedures

**Client asks: "How do I view the project?"**
- Team generates share link, copies URL
- Team sends via email/text
- Client clicks link, no login needed

**Client asks: "Can I download photos?"**
- MVP: No (browser can save images, that's fine)
- Phase 2: Add bulk download with rate limit

**Client asks: "Why can't I see budget?"**
- Team didn't enable budget sharing (set show_budget=true)
- Or: budget is for contractors only, not shared with clients

**Client says: "I don't want updates anymore"**
- Team clicks "Revoke" on the share link
- Link stops working, client gets friendly error

**Team asks: "Did the client look at the portal?"**
- Check `last_accessed_at` and `access_count` in project_shares
- If last_accessed_at is null, client hasn't opened link yet

---

## Next: Phase 2 (Future)

- [ ] QR code generation (easier to share on-site)
- [ ] Photo download (bulk ZIP, rate-limited)
- [ ] Budget breakdown (materials, labor, contingency)
- [ ] Timeline view (Gantt chart read-only)
- [ ] Comments/discussion (client can ask questions)
- [ ] Automatic link expiry (30 days default)
- [ ] White-label branding (contractor logo, colors)
- [ ] Multi-language support

---

## Implementation Status

- [ ] Database migration (project_shares table)
- [ ] Supabase RLS policies (read-only for clients)
- [ ] API endpoint GET /api/v1/client-portal/{token}
- [ ] API endpoint POST /api/v1/projects/{id}/shares
- [ ] API endpoint DELETE /api/v1/projects/{id}/shares/{token}
- [ ] Frontend HTML (public/client-portal/index.html)
- [ ] Frontend JS (public/client-portal/app.js)
- [ ] Frontend CSS (public/client-portal/style.css)
- [ ] Team UI button to manage shares
- [ ] Test against RLS policies
- [ ] E2E test (generate link, view portal, revoke)

---

## Why This Design?

**Lightweight:** Read-only, no complex state. Easy to maintain.

**High-value:** Clients see real progress, feel included. Builds loyalty.

**Low-ops:** No support burden. If client forgets link, team regenerates in 30 seconds.

**Secure:** Token-based, RLS enforced, no auth bloat. Clear data boundaries.

**Mobile-first:** Clients view on-site from phone during inspections.

**Supports your business:** Reduces change-order disputes ("I didn't know that area was already done").
