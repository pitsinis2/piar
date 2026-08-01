# Project Manager Web

Responsive browser prototype for desktop and mobile project management.

## Features

- Project manager setup with name and email
- Project start date, end date, status, client assignment, and custom workspace color per project
- Active project list with switching between projects
- Completed project list
- Client management with name, surname, company, UID number, address, email, phone, and multiple responsible persons
- Team members with name and email
- Custom folders
- Notes, files, uploaded photos, camera photos, and tasks inside each folder
- Naming logic like `Name_YYYYMMDD`, `Name2_YYYYMMDD`, `Name3_YYYYMMDD`
- Task assignment with member, due date, status, linked folders, and linked pictures
- Greek speech-to-text helper that fills task fields and creates bullet-point notes
- Mobile-friendly layout with a floating `+` button and quick action sheet
- Local browser storage

## Run

Open [index.html](C:\Users\8605\OneDrive - ASTA\Dokumente\Programming\ProjectManagerWeb\index.html) in a browser.

If camera or speech features need a local server:

```powershell
cd "C:\Users\8605\OneDrive - ASTA\Dokumente\Programming\ProjectManagerWeb"
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Assumptions

- This is a frontend-only first version.
- Data is stored in the browser, not yet shared across users.
- Bullet summaries are generated locally in the browser from the transcript.
- OpenAI/ChatGPT parsing can be added later when you provide the API details.
