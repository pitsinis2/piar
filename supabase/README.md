# Supabase (Backend Scaffold)

This folder scaffolds the backend pieces needed for **automatic Google Drive export 2x/day** (15-minute steps).

What is included:
- Postgres schema for company Drive sync settings + run logs.
- A scheduled Edge Function (`drive-sync`) that runs every 15 minutes and claims any companies that are due.

What is intentionally not included yet:
- Full migration of the whole app state (projects/areas/files/notes/photos) into Postgres.
- Google OAuth connect wizard (company admin connects Drive once).
- The actual export pipeline (writing folders/files to Drive). This depends on the data model + OAuth tokens.

## Deploy Steps (Manual)
1. Create a Supabase project.
2. Run the SQL migration in `/supabase/migrations`.
3. Deploy the Edge Function in `/supabase/functions/drive-sync`.
4. Configure a scheduled trigger (cron) to call `drive-sync` every 15 minutes.

## UI
`index_v2.html` includes a simple **Google Drive Sync** form (timezone + Time 1 + Time 2).
For now it stores settings locally in browser storage. Once the app uses Supabase auth/DB, this should persist per-company in `company_drive_sync_settings`.

