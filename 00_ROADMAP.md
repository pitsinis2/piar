# ProjectManagerWeb — Build Order

**Owner:** Fotis Pitsinis
**Supabase (dev):** PiAR — `ivdszujgmhpkebdgwoav` — Central EU (Frankfurt)
**Last updated:** 2026-07-31

This file exists to stop work happening in the wrong order. Each step makes the
next one smaller. Doing them out of order means building on foundations that get
replaced.

---

## Terminology — read this before writing any table name

The word "client" is used for two different things in this project. Never let it
stand alone in a table, column, or function name.

| Level | Who | Identity model |
|---|---|---|
| **Tenant / Org** | The plumbing or electrical company paying for the software | `org_code` + username + PIN |
| **Team member** | Manager, worker — belongs to an org | User row inside the tenant |
| **End client** | The building owner receiving the report | `client_access_token`, read-only, no account |

`org_code` and `client_access_token` are unrelated systems. They are not the
same feature at different scales.

---

## Step 0 — Establish which codebase is live  ← DO THIS FIRST

The repo contains both a root frontend (`index.html`, `app.js`, `styles.css`,
`index_v2.html`, `appback.js`) and a `saas-app/` subdirectory, plus a
`supabase/` folder and numbered backup folders.

Docs (`SAAS_TODO.md`, module READMEs) describe Supabase magic-link login with
admin/worker roles. It is not confirmed whether that is implemented or only
planned.

**Answer before touching code:**

1. Which entry point is the app actually run from?
2. Is the magic-link login implemented, or only documented?
3. Do the function names and line numbers in `01_STEP1_...md` match the live code?

Everything below assumes these answers exist.

---

## Step 1 — Files out of localStorage

Photos and files are stored as base64 data URLs inside one localStorage key.
localStorage caps at ~5–10 MB; a phone photo is 3–5 MB and base64 adds ~33%.
The app dies at the third real photo with `QuotaExceededError`, which can take
the whole project state with it.

**Spec:** `01_STEP1_FILES_OUT_OF_LOCALSTORAGE.md`

**Done when:** 30 phone photos upload, survive reload, and the localStorage blob
is kilobytes instead of megabytes.

Nothing below this line can be built until this is true.

---

## Step 2 — Auth and tenant separation

Reuse the model already proven on OpexMM: Org Code + Username + PIN, `tenant_id`
on every row, prefix never stripped from the org code.

Two deliberate changes from OpexMM, both fixing known debt there:

- **Hash the PINs.** Recommended approach: keep the Org Code + Username + PIN
  screen as the UX, but back it with Supabase Auth using a synthetic email
  (`user@p12345678.internal`) and the PIN as password. Hashing comes free, real
  sessions come free, and `tenant_id` lands in the JWT so RLS works.
- **RLS on from the first table.** Automatic RLS is already enabled on this
  Supabase project. Do not disable it to make something work.

Also close the dev storage policy from Step 1 here. **No real customer data goes
into the bucket until this step is finished.**

---

## Step 3 — Data into real tables

Move entities from the localStorage blob into Postgres, `tenant_id` on each.

Order: `projects` → `areas` → `notes` → `tasks` first, because those are what the
AI assistant reads. Chat, planner, daily works, equipment can stay in the blob
longer than expected.

---

## Step 4 — Daily backup to Google Drive (admin)

Google Drive, not OneDrive — simpler API, 15 GB free, and the target market is
overwhelmingly on Gmail. Do not build both.

Folder shape:

```
/ProjectManagerWeb/<OrgCode> - <Org Name>/
  /<Project Number> - <Project Name>/
    /_project-details/photos|files|plans/
    /<Area Name>/                        e.g. "mpanio2 - 1"
      /photos/  /files/
      conversations/2026-07-28_ai-assistant.md
      notes.md  tasks.md
    /_teams/<Team Name>/photos|files/
    /_chat/room.md  attachments/
  /2026-07-31/backup.json
```

Rules:
- **Mirror photos** (upload only new/changed), **snapshot** JSON and
  conversations daily. Re-uploading every photo daily burns storage fast.
- Write `.md` for humans **and** `backup.json` for restore.
- **Server-side cron.** A browser-side job only runs when someone has the tab
  open, which means it fails exactly during the busy weeks.
- The existing Settings panel (`#drive-sync-form`, `normalizeDriveSyncSettings`,
  `renderDriveSyncSettings`) already stores enable/timezone/two-export-times.
  There is no export logic behind it yet — the switch exists, the machine does not.
- `sanitizeName()` strips non-ASCII (`μπάνιο` → `Item`, `Küche` → `Kche`). Fine
  for internal IDs, destroys folder names. Backup needs its own sanitizer.

---

## Step 5 — End-client portal

Read-only view where the building owner sees a folder structure named after the
project, containing only what the manager published.

Design principles (these are the ones that prevent the worst bug — a photo the
manager believed was hidden being visible to the client):

- **`client_visible` defaults to false** on every area, file, photo and note.
  The manager explicitly publishes. Safe-by-default beats remembering to hide.
- **One shared query, two callers.** "Preview as client" and the real portal call
  the same fetch function with the same filter. Never a separate client API that
  can silently drift from the admin preview.
- **Private storage, short-lived signed URLs** at render time. A leaked link
  expires; nothing is permanently public.
- **`client_access` is a token row, not a Supabase Auth user.** Long random
  token, which project(s) it unlocks, expiry, revoked flag, last-viewed
  timestamp. Clients consume no seat and cannot reach the admin app.
- **The folder tree is a presentation layer**, not a second storage tree. Same
  relational data rendered as folders — never two copies of a file to keep in sync.

Open questions to answer when this step starts:

1. How does the client get in — emailed link, or a code they type?
2. Does one grant cover one project or all of that client's projects?
3. View-only, or can the client comment?

---

## Standing rules

- After editing `saas-app/appback.js`, sync to `saas-app/public/appback.js`
- The Supabase **anon** key may ship in the browser. The **service_role** key
  never appears in any frontend file.
- The OpenAI key never reaches the browser — always through the backend
- `getTenantId()` must never strip the prefix from an org code. That bug caused
  a tenant leak on OpexMM.
- Do not refactor unrelated code while inside these files
- Free-tier limits: 1 GB storage (~200–300 construction photos), no automatic
  backups, project pauses after 7 days idle
