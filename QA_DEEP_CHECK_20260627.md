# Deep QA Check - 2026-06-27

## Backup

Created before QA:

`C:\Users\pitsi\Documents\Programming\ProjectManagerWeb\backups\before-deep-qa-20260627-191506`

Backed up:

- `saas-app/index.html`
- `saas-app/appback.js`
- `saas-app/public/appback.js`
- `saas-app/stylesback.css`
- `saas-app/styles-futuristic.css`
- `saas-app/package.json`

## Automated Checks Run

- JavaScript syntax check passed for `saas-app/appback.js`.
- JavaScript syntax check passed for `saas-app/public/appback.js`.
- `saas-app/appback.js` and `saas-app/public/appback.js` are identical.
- `npm.cmd run build` passed.
- Production `dist/appback.js` exists and passed JavaScript syntax check.
- Temporary Vite server returned HTTP 200 for `/?demo=client&preview=qa`.
- Demo HTML includes `appback.js`.
- Demo HTML includes `.mobile-bottom-nav`.

## Build Notes

Vite still reports:

`<script src="appback.js"> in "/index.html" can't be bundled without type="module" attribute`

This is currently acceptable because the original product script is intentionally preserved as a classic script. Do not convert it to module until the visible UI is safely protected by tests.

## Static Findings

### OK

- No duplicate top-level `function ...()` declarations were found in `saas-app/appback.js`.
- All visible `data-view` navigation buttons map to existing page views.
- Main dialogs are present, including Service Team, Area, Note, Task, Planner, Daily Work, Viber, Camera, Photo Upload, and Confirm dialogs.
- The new Service Team assigned-area wiring exists:
  - `service-team-area-links`
  - `serviceTeamSelectedAreaIds`
  - `syncServiceTeamAreaAssignments`
  - `renderServiceTeamAreaOptions`

### Needs Attention Later

- Some JavaScript ID lookups are optional/dynamic and do not exist directly in initial HTML. Most are safe because optional chaining is used or the elements are generated later.
- Mobile behavior is currently activated around `max-width: 1180px`, not only true phone width. This may make tablet/narrow desktop views behave like mobile.
- Several older flows still use `window.prompt()` or `window.alert()`. They work, but they are not ideal for professional client demos or mobile:
  - PIN prompts
  - New floor name
  - File group name
  - Daily work contact edits
  - Some task edits
- `saas-app/README.md` is outdated and still describes the folder as a "Clean future version". This conflicts with the current product rule that the restored original UI is the baseline.

## Runtime Areas Still Requiring Manual/Browser QA

These need real clicking/testing in browser or Playwright-style automation:

- Project creation, edit, archive, restore.
- Area creation, edit, archive, restore, delete confirmation.
- Floor assignment/filtering for areas.
- Service Team creation/edit:
  - color live preview
  - member selection
  - assigned-area checkbox behavior
  - unsaved-changes warning
  - team icon appears in assigned areas
- Notes:
  - simple note
  - checklist note
  - project Info/Plans note
  - area note
  - team note
- Photos:
  - select file
  - take picture
  - area selection
  - own-upload delete permissions
- Files:
  - upload
  - area/team metadata
  - archive/restore
- Planner:
  - week navigation
  - unavailable days
  - past dates read-only
  - conflict warnings
  - project rows stay aligned across days
- Daily Works:
  - create/edit/delete daily work
  - hour slots
  - flashing/important visual cue
- Team Members:
  - add member starts with no project assignment
  - personal number visible
  - details show all personal information
  - deactivate/edit
- Equipment:
  - add category
  - delete category
  - tools become uncategorized when category is deleted
- Clients:
  - add/edit/delete
  - assigned project display
- Chat:
  - open chat room
  - send message
  - mark important
  - important message copied as note
- Notifications:
  - bell opens
  - notification list behavior
- Mobile preview:
  - bottom nav buttons
  - project list to detail
  - modals fit mobile screen
  - team rail usability
  - phone link on same WiFi

## Recommended Next Steps

1. Keep this restored UI as the baseline.
2. Add a small browser smoke-test system before adding AI/backend.
3. Fix client-demo/mobile presentation issues first because this is what a customer will see.
4. Replace remaining `prompt()` flows with existing styled dialogs.
5. Update `saas-app/README.md` so future work does not accidentally go back to the generic SaaS shell idea.
6. Only after the visible product is stable, start modular refactor and Supabase integration.
