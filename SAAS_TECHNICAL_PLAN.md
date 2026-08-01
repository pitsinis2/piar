# SaaS Technical Plan

## Decision

Build the real product as an online SaaS web app.

Do not build an `.exe` for v1.

The first production direction is:

- Frontend: TypeScript web app
- Hosting: Vercel or Netlify
- Backend/database/auth: Supabase
- Login: magic link
- Mobile shortcut: PWA install / Add to Home Screen
- Files/archive: Google Drive connected by the company admin
- Chat: internal project chat stored in Supabase
- License: manual company user limit for first customers

## Why This Stack

Supabase gives the difficult SaaS parts without managing our own server:

- Authentication
- Magic links
- PostgreSQL database
- Realtime chat
- Row-level security
- Edge Functions for Google Drive sync/export
- Scheduled functions later

Vercel/Netlify host the app UI.

Google Drive remains the human-readable archive/folder layer, not the main database.

## First Product Shape

### Admin

The company owner/admin can:

- Manage company settings
- Invite users
- Activate/deactivate users
- Create projects
- Create floors and areas
- Create teams
- Connect Google Drive
- View all project data
- Manage license seats manually

### Worker

The worker can:

- Login with magic link
- See projects only
- Open a project
- Select floor/area
- Upload photo/file
- Add note
- Use project chat

Workers should not see equipment, clients, settings, audit, or admin screens in v1 unless later required.

## Google Drive Model

Supabase database is the source of truth.

Google Drive is an export/archive mirror.

Folder structure:

```text
Company Root
  Project 0001 - Project Name
    Plans
    Floor 1
      Bathroom
        Photos
        Files
        Notes
      Kitchen
        Photos
        Files
        Notes
    Logs
```

Uploads go through the app and are stored/exported to Drive.

Notes are stored in the database and exported as `.txt` or `.md` first.

PDF export can come later.

## PWA Mobile Shortcut

The app will include:

- `manifest.webmanifest`
- mobile icons
- installable browser app behavior

Users can open the website and add it to the home screen.

No App Store is needed for v1.

## Chat

Use Supabase tables for chat:

- project chat rooms
- messages
- important flag

Later:

- realtime subscriptions
- push notifications
- important messages copied to project notes

## Development Rule

Do not rewrite everything at once.

Use the current prototype as a reference.

Build the clean SaaS app in `saas-app/`.

Keep the old prototype available until the SaaS app replaces each part.

