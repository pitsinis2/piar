# OpenAI Connection Plan

The AI Assistant should use ChatGPT through a secure backend endpoint, not directly from the browser.

## Why

The OpenAI API key must never be stored in `index.html`, `appback.js`, localStorage, or any frontend file. The browser should send the transcript to our own backend, and the backend should call OpenAI.

## Current Flow

1. User presses Start.
2. User speaks as long as needed.
3. User presses Stop.
4. The app creates a local fallback draft.

## Target Flow

1. User presses Start.
2. User speaks as long as needed.
3. User presses Stop.
4. Browser sends transcript, mode, project context, language, and `AI_SECRETARY_SPEC.md` instructions to a secure backend endpoint.
5. Backend calls OpenAI.
6. Backend returns:
   - improved draft
   - questions for the user
   - confidence / needs-review status
7. User reviews, optionally adds more speech, listens to the draft, and saves.

## Endpoint Shape

```http
POST /api/ai-secretary
```

Request:

```json
{
  "mode": "summary",
  "language": "English",
  "project": {
    "id": "project-id",
    "name": "Project name"
  },
  "area": {
    "id": "area-id",
    "name": "Area name"
  },
  "transcript": "messy spoken text"
}
```

Response:

```json
{
  "draft": "organized secretary-style draft",
  "questions": [
    "Please confirm whether 330 means 30 of the month."
  ],
  "needsReview": true
}
```

## Implementation Options

### Option A: Supabase Edge Function

Best fit for the SaaS app later.

- Store `OPENAI_API_KEY` as a Supabase secret.
- Browser calls Supabase function.
- Function calls OpenAI.

### Option B: Local Node Server

Best for local testing.

- Add a small local server.
- Store `OPENAI_API_KEY` in `.env`.
- Vite proxies `/api/ai-secretary` to the server.

## Speaker Time Rule

The browser must not send the transcript to the backend until the user presses Stop.

Pauses are part of natural speech. The assistant should wait and keep listening whenever possible.
