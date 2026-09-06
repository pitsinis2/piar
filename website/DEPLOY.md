# Putting opexpi.com live

The site is plain HTML, CSS and one JS file. There is no build step, so a
static host serves it as-is.

Two steps below need the Vercel account and the domain registrar, so they have
to be done by hand. Everything else is already configured.

## 1. Create the Vercel project

The existing Vercel project serves `saas-app` at the repository root. This site
needs its **own project** pointing at a different folder, or the two would
compete for the same domain root.

In the Vercel dashboard:

1. **Add New → Project**, import the same GitHub repository (`pitsinis2/piar`).
2. Set **Root Directory** to `website`.
3. Leave the framework as **Other**. There is no build command and no output
   directory to set — `vercel.json` in this folder covers the rest.
4. Deploy.

It will come up on a `*.vercel.app` address. Check that one first: the site
should look identical to what runs locally.

## 2. Point the domain

In the new project: **Settings → Domains → Add**, enter `opexpi.com`, and add
`www.opexpi.com` alongside it (Vercel offers to redirect one to the other —
pointing `www` at the apex is the usual choice).

Vercel then shows the exact DNS records to create at whoever holds the domain.
They are normally:

| Type  | Name  | Value                   |
|-------|-------|-------------------------|
| A     | `@`   | `76.76.21.21`           |
| CNAME | `www` | `cname.vercel-dns.com`  |

**Use the values Vercel shows you, not these** — they are what it uses today,
but the dashboard is the authority and it will tell you if they differ.

DNS usually takes minutes; the certificate is issued automatically once the
records resolve.

### Do not touch the piar record

`piar.opexpi.com` already points at the app. It is a separate record on the
same domain and adding the apex does not disturb it — just leave it alone.

## 3. Afterwards

Two things in the site are placeholders and should be real before it is
advertised anywhere:

- **`info@opexpi.com`** — used by the contact button and in the footer. It does
  not exist yet, so mail to it will bounce.
- **The legal links** in the footer point at OpexMM's pages. An Austrian
  Impressum has to carry accurate company details, so those need their own
  pages or links to the correct ones.

## Running it locally

```bash
npx serve -l 4321 website
```

Then open http://localhost:4321. `node scripts/check-website.js` runs the
64 checks against that server.
