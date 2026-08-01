# Step 1 — Move files out of localStorage into Supabase Storage

**Project:** ProjectManagerWeb (`saas-app`)
**Supabase project:** PiAR — `ivdszujgmhpkebdgwoav` — Central EU (Frankfurt)
**Goal:** photos and files stop being base64 strings inside the localStorage blob.

---

## 0. Why this first

Today every uploaded photo is stored as a base64 data URL inside one localStorage
key (`project-manager-web-state-v3`). localStorage holds roughly 5–10 MB per
origin. A phone photo is 3–5 MB, and base64 adds ~33%.

Result: after two or three real photos the app throws `QuotaExceededError` and
`persist()` fails — which can lose the entire project state, not just the photo.

Nothing else (org separation, daily cloud backup, multi-user, pilot) can be built
on top of storage that dies on the third photo.

**Done means:** you can upload 30 photos from a phone, reload the browser, and
everything is still there.

---

## 1. Scope

### In scope
- Create a Supabase Storage bucket
- Add a Supabase client to the frontend
- Change the 4 places that create base64
- Change the ~15 places that read it, via one new resolver function
- Migrate base64 assets already sitting in localStorage

### Explicitly OUT of scope
- Auth / login (that is Step 2)
- Moving projects/areas/notes/tasks into Postgres tables (Step 3)
- The Google Drive backup (Step 4)
- Any UI redesign

Do not start these. Each one gets easier after Step 1 lands.

---

## 2. Supabase setup

### 2.1 Create the bucket

Dashboard → Storage → New bucket:

- Name: `project-files`
- Public: **yes, for now** (see 2.3 — this is temporary and gated)
- File size limit: `10 MB`
- Allowed MIME types: leave empty (files as well as photos go here)

### 2.2 Dev policy

Run in SQL Editor:

```sql
-- DEV ONLY. Replaced in Step 2 when auth exists.
create policy "dev_anon_read"
  on storage.objects for select
  to anon
  using (bucket_id = 'project-files');

create policy "dev_anon_write"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'project-files');

create policy "dev_anon_update"
  on storage.objects for update
  to anon
  using (bucket_id = 'project-files');
```

### 2.3 Gate — read this

This bucket is open to anyone holding the anon key, which ships in the browser.

**No real customer data goes in here until Step 2 (auth + tenant-scoped policies)
is finished.** Test with your own photos only. Write it in your calendar if you
have to. This is exactly the shortcut that became technical debt on the other
project.

---

## 3. Storage path convention

```
{tenantId}/{projectId}/{assetId}.{ext}
```

Example:

```
00000000/3f2a9c1e-.../a71b04d9-....jpg
```

Two rules behind this, both deliberate:

1. **`tenantId` is the first segment from day one**, even though there is no auth
   yet. In Step 2 the storage policy becomes a prefix check on this segment and
   nothing has to move. Use the constant `00000000` for now — same convention as
   the internal-testing org code on OpexMM.

2. **The path does NOT encode area or folder.** Assets move between areas; paths
   must not. The hierarchy lives in the app state. The Drive backup in Step 4
   builds its `Project/Area/` folder tree by reading state at backup time, not by
   parsing storage paths.

---

## 4. New file: `saas-app/supabase-client.js`

```js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ivdszujgmhpkebdgwoav.supabase.co";
const SUPABASE_ANON_KEY = "<anon key from dashboard - Settings > API>";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const STORAGE_BUCKET = "project-files";

// Step 2 replaces this with the tenant id from the session.
export function getTenantId() {
  return "00000000";
}
```

Notes:

- The **anon** key belongs in the browser. It is designed for that.
- The **service_role** key must never appear in any frontend file. Ever.
- `getTenantId()` must never strip a prefix from the code it returns. That bug
  caused a tenant leak on the other project.

---

## 5. New helpers in `appback.js`

Add near the existing `toStoredAsset` / `readAsDataUrl` block (~line 17718).

```js
function getFileExtension(file) {
  const fromName = String(file?.name || "").match(/\.([a-z0-9]{1,8})$/i);
  if (fromName) return fromName[1].toLowerCase();
  const mime = String(file?.type || "").toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

async function uploadAssetToStorage(blob, assetId, extension) {
  const projectId = state.selectedProjectId || "no-project";
  const path = `${getTenantId()}/${projectId}/${assetId}.${extension}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw error;
  return path;
}

// THE resolver. Every render point goes through this.
function getAssetUrl(item) {
  if (!item) return "";
  if (item.storagePath) {
    return supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(item.storagePath).data.publicUrl;
  }
  // legacy base64, still valid until migrated
  return item.previewUrl || item.objectUrl || item.dataUrl || item.imageUrl || "";
}
```

### Why the resolver matters

In Step 2 the bucket goes private and URLs must be signed. When that happens,
**only `getAssetUrl` changes** — it starts returning a cached signed URL instead
of a public one. If render points call `getPublicUrl` directly, you will be
editing fifteen call sites again under time pressure. Do it once, now.

---

## 6. The four write points

Each keeps its existing shape and adds `storagePath`. Keep the legacy field
present but empty so nothing else breaks.

### 6.1 `toStoredAsset` — line ~17718 (file/photo upload)

Replace the `readAsDataUrl` call with an upload:

```js
async function toStoredAsset(file, type, baseName, index, dateStamp) {
  const id = crypto.randomUUID();
  const storagePath = await uploadAssetToStorage(file, id, getFileExtension(file));
  const normalizedName = createSequencedName(baseName, index, dateStamp);

  if (type === "photo") {
    return { id, type: "photo", title: normalizedName, storagePath, previewUrl: "",
             mimeType: file.type, originalName: file.name,
             createdAt: new Date().toISOString(), createdByUserId: state.currentUserId,
             source: "upload", archivedAt: null, archivedByUserId: null,
             showOriginalName: false };
  }
  return { id, type: "file", title: normalizedName, storagePath, objectUrl: "",
           mimeType: file.type, originalName: file.name,
           createdAt: new Date().toISOString(), createdByUserId: state.currentUserId,
           archivedAt: null, archivedByUserId: null, showOriginalName: false };
}
```

### 6.2 `onCapturePhoto` — line ~9291 (camera)

`canvas.toDataURL(...)` becomes `canvas.toBlob(...)`:

```js
const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
const id = crypto.randomUUID();
const storagePath = await uploadAssetToStorage(blob, id, "jpg");
```

Then set `id`, `storagePath`, and `previewUrl: ""` on `capturedPhoto`.

Note: the existing `window.confirm("Are you happy with the picture?")` should be
asked **before** uploading, so a rejected photo never reaches storage.

### 6.3 `createChatAttachmentFromFile` — line ~9871

Replace `dataUrl` with `storagePath`, same pattern.

### 6.4 Note images — lines ~8104 and ~8462

`pendingNoteImageDataUrl` becomes `pendingNoteImageStoragePath`. It is written to
`note.imageUrl` at lines ~8474 and ~8494 — change that field to
`note.imageStoragePath` and render it through `getAssetUrl`.

---

## 7. The read points

Swap the direct field for `getAssetUrl(item)`:

| Line | Current |
|---|---|
| 14339 | `photo.previewUrl` in linked-photo thumbnails |
| 14465, 14477, 14480 | gallery entry builder (`previewUrl`) |
| 14466, 14486, 14489 | gallery entry builder (`objectUrl`) |
| 15278 | area progress strip |
| 15452 | photo preview row |
| 16229 | file download link (`href`) |
| 16236 | file image preview |
| 16251 | photo item render |
| 8089 | note image preview |

All are `<img src>` or `<a href download>`, so the substitution is mechanical.

---

## 8. Migration of existing base64

One-time, runs on load, converts anything still holding a data URL.

```js
async function migrateLegacyAssetsToStorage() {
  if (state.assetsMigratedAt) return;
  const pending = [];

  for (const project of state.projects || []) {
    for (const folder of getAllProjectFolders(project) || []) {
      for (const item of folder.items || []) {
        const legacy = item.previewUrl || item.objectUrl || "";
        if (legacy.startsWith("data:") && !item.storagePath) pending.push(item);
      }
    }
  }

  if (!pending.length) {
    state.assetsMigratedAt = new Date().toISOString();
    persist();
    return;
  }

  showAppMessage(`Moving ${pending.length} files to cloud storage...`, "info", "Migration");

  for (const item of pending) {
    try {
      const legacy = item.previewUrl || item.objectUrl;
      const blob = await (await fetch(legacy)).blob();
      const ext = (blob.type.split("/")[1] || "bin").replace("jpeg", "jpg");
      item.storagePath = await uploadAssetToStorage(blob, item.id, ext);
      item.previewUrl = "";
      item.objectUrl = "";
    } catch (error) {
      console.error("Migration failed for asset", item.id, error);
      // leave the legacy data URL in place; getAssetUrl still resolves it
    }
  }

  state.assetsMigratedAt = new Date().toISOString();
  persist();
  showAppMessage("Migration finished.", "success", "Migration");
}
```

**Before running it:** open DevTools → Application → Local Storage, copy the
whole `project-manager-web-state-v3` value into a text file. That is your undo.

Failures are non-fatal by design — a failed item keeps its data URL and still
renders, so a partial migration never blanks an image.

---

## 9. Test plan

1. Upload 1 photo → check it appears in Storage → `project-files` in the dashboard
2. Reload the browser → photo still renders
3. Upload 30 photos from a phone → no `QuotaExceededError`
4. DevTools → Application → Local Storage → the state value should now be
   kilobytes, not megabytes. **This is the number that proves Step 1 worked.**
5. Camera capture → uploads, renders, survives reload
6. Chat attachment → uploads, renders
7. Note with image → uploads, renders
8. File (non-image) → download link works and gives back the original file
9. Load an old browser profile with base64 photos → migration runs once, photos
   survive, `assetsMigratedAt` is set, second reload does not re-migrate

---

## 10. Guardrails

- After editing `saas-app/appback.js`, sync to `saas-app/public/appback.js`
- `@supabase/supabase-js` is already in `package.json` — no new dependency
- Do not put the service_role key anywhere in the frontend
- Do not refactor anything unrelated while in these files
- Do not begin Step 2, 3 or 4 until the test plan above passes
- No real customer data in the bucket until Step 2 closes the dev policy
