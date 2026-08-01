# SaaS Product Direction

## Product Goal

Build an online SaaS project management tool for construction/service teams such as plumbers, electricians, technicians, and workers who are not necessarily comfortable with complex software.

The app must be simple, mobile-friendly, and focused on real site work:

- Open project
- Select area/floor
- Upload photos
- Upload files
- Add notes
- Keep a clear history
- Export/archive information into customer-friendly folders

## Important Decisions

- The product should be an online web app, not an `.exe`.
- First version should use magic-link login.
- One customer equals one company/tenant.
- The company owner is the company admin.
- Workers should see only projects and the upload/workflow they need.
- First customers can be managed with manual license limits.
- Inactive users should not count against the license.
- Google Drive should be connected once by the company admin for the whole company.

## Recommended Technical Direction

Use Supabase for the first SaaS version:

- Auth with magic links
- Database
- Company/tenant separation
- Role permissions
- License limits
- Later: scheduled Google Drive sync/export through Edge Functions

Google Drive should not be the main database.

The app database is the source of truth.

Google Drive is the archive/export layer where customers can see normal folders and files.

## First Roles

Start with only two roles:

- `admin`: company owner/office user. Can manage company, users, projects, teams, settings, and licenses.
- `worker`: technical team member. Can access projects and upload photos/files/notes.

Avoid adding many roles in v1 unless necessary.

## Google Drive Logic

When the company admin connects Google Drive:

1. App creates one company root folder.
2. Every project creates a project folder.
3. Every floor/area creates subfolders.
4. Uploaded photos/files are saved in the correct folder.
5. Notes are saved in the database and exported as simple files.

Start note export with `.txt` or `.md`.

Later, add `.pdf` export if needed.

Optional future feature:

- Sync changes made directly inside Google Drive back into the app.

This is nice to have, but not required for v1.

## License Logic

Manual license management for first customers:

- Each company has `max_active_users`.
- Admin cannot activate more users than the license allows.
- Inactive users do not count.
- Payment automation can come later.

## Current Prototype Status

The current prototype works in many areas but has become too large and difficult to maintain.

Current cleanup already started:

- Mobile CSS was extracted from `index_v2_mobile.html`.
- Mobile CSS now has module files under `css/mobile/`.
- Mobile planner and navigation scripts were extracted into `js/`.
- A clean SaaS preview exists in `saas-app/preview.html`.
- The SaaS preview now follows the original left rail + list + detail workspace direction.
- Projects, Planner, Team Members, Equipment, Clients, Settings, and Audit Log are visible in the SaaS rail.
- Non-project sections have selectable left-list items and draft detail panels.
- Rich add dialogs are being restored step by step, starting with Service Team, Project, Member, Client, Equipment, and Planner entries.
- Archive/restore and rail collapse arrows are now visible in the SaaS preview instead of hidden behind unclear menus.
- Planner drag/drop is currently preview-level only; it must become database-backed before production.
- Project floor/area filtering is active in the SaaS preview, with an explicit floor dropdown and area text search.
- Preview changes now use local browser storage so the demo is less fragile during testing; production persistence still belongs in Supabase.

The mobile version currently has optical and structural issues.

This is not a blocker for the SaaS direction.

Do not keep adding random CSS overrides to the prototype.

Use the prototype as reference, then rebuild/clean the real product step by step.

## Near-Term Plan

1. Freeze current working prototype with backups.
2. Clean the mobile UI only enough to understand the desired user flow.
3. Define the database schema for SaaS.
4. Create Supabase project structure.
5. Implement company/tenant model.
6. Implement magic-link login.
7. Implement roles: admin and worker.
8. Implement manual license limit.
9. Rebuild projects, floors, areas, teams, notes, files, photos on top of the database.
10. Add Google Drive connection wizard.
11. Add Drive folder/export logic.

## Mobile UX Principle

Mobile is mainly for workers.

It should be very simple:

- Bottom navigation
- Project list
- Project detail
- Area/floor selection
- Big upload buttons
- Photos/files/notes
- Minimal settings

Do not expose complex admin screens to workers on mobile unless needed.

## Rule Going Forward

Before large changes:

1. Make a backup.
2. Change one area only.
3. Test that area.
4. Continue.

Do not split all JavaScript at once.

Split modules gradually when the boundaries are clear.

## Optimization Notes From Rebuild

- Keep the original `index_v2` as the behavior reference, but do not copy all old code into the SaaS app.
- Preserve color rules, drag/drop, dropdowns, archive/restore, and hide/unhide arrows because these are core workflows for the user.
- Replace unclear three-dot actions with visible buttons when possible, especially on mobile and for non-technical workers.
- Every preview-only interaction should later be connected to database state, otherwise refresh will lose it.
