# Admin panel (local only)

This panel can create and delete organizations, reset PINs, and wipe all data.
It is deliberately **outside `public/`** so it is never deployed to the website.
Anything in `public/` is copied verbatim into the build and served to the
internet; this folder is not.

## Running it

Open `index.html` directly from disk:

```bash
start saas-app/admin-local/index.html
```

It talks to the deployed Supabase functions, so it works fine from a local file.

## The token

There is no token in these files. On first use the panel asks for the
`ADMIN_PANEL_TOKEN` and keeps it in that browser's localStorage. "Log out"
clears it. The token is verified by the server, not by this page.

To see or change the token:

```bash
npx supabase secrets list
npx supabase secrets set ADMIN_PANEL_TOKEN="<new value>"
```

## Do not

- Move this folder back under `public/`.
- Paste the token into any file in this repo. The repository is public, and a
  token committed here is a token that has to be rotated.
