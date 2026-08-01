# ProjectManagerWeb - What The App Can Do From 0 To 100

This document describes the current ProjectManagerWeb SaaS app, what it can already do, what the AI Assistant is becoming, and what the next development steps are.

Tomorrow's starting point:

Build the deterministic area parser:

```text
mpanio2 - 1
```

must become:

```json
{
  "rawName": "mpanio2 - 1",
  "name": "mpanio2",
  "floor": "1",
  "roomType": "bathroom",
  "status": "open"
}
```

This is important because the AI must not guess the floor from text every time. The app should understand the project structure first, then give the AI clean project data.

---

## 0. Product Idea

ProjectManagerWeb is a browser-based project management app for construction, renovation, service teams, and field work.

The goal is not only to store projects. The goal is to help a company understand:

- What projects exist.
- Who is responsible.
- What work is open.
- What happened on site.
- What was decided.
- What materials are needed.
- What problems exist.
- What should be done next.
- What should be communicated to the client.

The app is being developed as a SaaS-style product.

---

## 1. Main App Structure

The app contains these main areas:

- Projects
- Planner
- Daily Works
- Team Members
- Equipment
- Clients
- Settings / Theme
- Audit Log
- AI Assistant

The app is designed to work on desktop and mobile.

It currently runs as a browser app with local browser storage. The AI Assistant can connect to a local OpenAI-powered server.

---

## 2. Projects

Projects are the core object of the app.

A project can have:

- Project name
- Project number
- Client
- Project manager
- Start date
- End date
- Status / lifecycle
- Custom color / visual identity
- Project details folder
- Service team folders
- Areas
- Notes
- Files
- Photos
- Tasks
- Chat messages
- AI-generated notes or conversations

Projects can be:

- Active
- Completed
- Archived

The app shows active, completed, and archived projects separately.

---

## 3. Project Creation And Project Lock

The app protects incomplete projects.

Before a project is fully usable, it needs the required basic data:

- Project name
- Project manager
- Client

This prevents users from creating empty or unclear project records.

---

## 4. Project Workspace

Inside a project, the user works in a project workspace.

The workspace includes:

- Project details
- Plans
- Areas
- Tasks
- Teams
- Chat
- Service team folders

The workspace is organized so the user can move between project-level information and team/area-level information.

---

## 5. Project Details Folder

Every project has a built-in Project Details folder.

This folder can contain:

- General project notes
- Plans
- Files
- Photos
- Project-level tasks
- Important project information
- Saved AI conversations

This is the main place for central project information.

---

## 6. Areas

Areas represent parts of the project.

Examples:

- Bathroom 1
- Bathroom 2
- Kitchen
- First floor area
- Apartment area
- Boiler room

Currently, areas can contain:

- Notes
- Files
- Photos
- Tasks
- Team links
- Area-specific comments

Areas can be:

- Open
- Completed
- Archived

The current problem:

The app can show areas, but the AI still needs better structured data about them.

Example:

```text
mpanio2 - 1
```

means:

- area name: mpanio2
- room type: bathroom
- floor: 1

Tomorrow's parser work will make this explicit.

---

## 7. Service Teams / Folders

A project can have service teams or folders.

Examples:

- Plumbing team
- Electrical team
- Painting team
- Construction team
- External subcontractor team

Each team/folder can contain:

- Notes
- Files
- Photos
- Tasks
- Team-related project records

Teams can have members.

Team visibility and permissions are connected to user roles and team membership.

---

## 8. Notes

The app supports notes in several places:

- Project details
- Areas
- Service teams
- Chat-important messages
- AI-generated conversations
- AI-generated summaries

Notes can include:

- Title
- Content
- Checklist style
- Text style
- Image
- Master plan visibility
- Creation user
- Creation date
- Archive state

Notes are one of the most important sources for the AI Assistant.

---

## 9. Checklist Notes

Notes can be saved as checklists.

A checklist note can contain multiple items.

This is useful for:

- Material checks
- Work steps
- Site inspection lists
- Open items
- Delivery checks

The AI Assistant should later be able to read checklist items as structured project facts.

---

## 10. Files

The app can store files inside project records.

Files can be connected to:

- Project details
- Areas
- Service teams
- Chat messages

Files are stored in the browser data model in the current version.

Future production version should use secure cloud storage.

---

## 11. Photos

The app supports photos.

Photos can come from:

- File upload
- Camera capture
- Chat attachments

Photos can be stored in:

- Project details
- Area records
- Team folders
- Chat messages

Photos can help document damage, progress, material condition, and site issues.

Future AI work:

- The AI should eventually inspect photo metadata and possibly image content.
- For now, it can use photo titles and attachment names.

---

## 12. Tasks

Tasks can be created inside projects, areas, and team folders.

Tasks can include:

- Title
- Notes
- Status
- Assignee
- Due date
- Linked team
- Linked area
- Linked files/photos

Task statuses include open/done-style behavior.

Tasks are visible in:

- Project workspace
- Area views
- Team folders
- Assigned tasks overview
- Planner-related workflows

The AI Assistant should use tasks to answer:

- What is still open?
- Who is responsible?
- What needs to be done?
- What is delayed?
- What is missing before we continue?

---

## 13. Project Chat

The app includes project chat.

Chat can happen in:

- Project room
- Team room
- Direct member chat

Chat messages can include:

- Text
- Attachments
- Pictures
- Files
- Sender
- Date
- Channel

Important chat messages can be marked and turned into project notes.

AI Assistant should read project chat as conversation/project history.

---

## 14. Mark Important Chat As Notes

Project chat messages can be marked as important.

When marked important, they become project notes.

This helps convert informal communication into structured project memory.

Examples:

- "Client approved the change."
- "The plumber damaged the pipe."
- "We need to replace the bathtub."
- "Delivery will be late."

---

## 15. Master Plan / Collected Comments

Some notes can be marked visible on the master plan.

The app can collect important comments from:

- Project details
- Areas
- Teams

This creates a project-level overview of important comments.

---

## 16. Clients

The app has client management.

Client records can include:

- Name
- Surname
- Company
- UID number
- Address
- Email
- Telephone
- Responsible persons

Projects can be connected to clients.

The project overview can show client information.

Clients can be:

- Active
- Archived
- Permanently deleted by permitted users

---

## 17. Team Members

The app has team member management.

Members can have:

- Name
- Email
- Role
- Work mode
- Qualifications
- Permission level
- Project involvement

Members can be assigned to:

- Projects
- Service teams
- Tasks
- Planner assignments
- Daily Works

---

## 18. Roles And Permissions

The app includes role and permission logic.

Permissions protect actions such as:

- Creating projects
- Editing projects
- Managing project content
- Managing users
- Changing roles
- Deleting members
- Creating admins
- Managing equipment
- Viewing or editing tasks
- Archiving records

The app prevents users from doing actions they do not have permission to do.

---

## 19. Permission Preview / Permission Matrix

The Team Members area includes permission-related views.

The app can show:

- What a user can do
- Which permissions are elevated
- Which role a member has
- Whether the current user can change another member's role

This is important for SaaS-style multi-user behavior.

---

## 20. Planner

The app includes a planner.

Planner features:

- Week view
- Day view
- Hourly slots
- 2-hour slots
- 4-hour slots
- Team assignment
- Project assignment
- Date
- Start time
- End time
- Notes
- Assignment editing
- Assignment deletion

Planner helps answer:

- Which team is planned?
- Which project is planned?
- Who is busy?
- What is scheduled today?
- What is scheduled this week?

Future AI work:

- Ask AI: "Which operator is not planned today?"
- Ask AI: "Which team can go to this project tomorrow?"
- Ask AI: "Is Panagiotis already planned?"

---

## 21. Daily Works

Daily Works are field-work records.

They can include:

- Title
- Date
- Start time
- End time
- Client
- Address
- Phone
- Map link
- Work link
- Assigned members
- Notes
- Status

Daily Works can create saved contact/address suggestions.

Daily Works help answer:

- What happened today?
- Who visited the site?
- What work was planned?
- What contact information was used?
- Which address belongs to a job?

---

## 22. Daily Work Contacts

The app can remember contact information from Daily Works.

This creates reusable contact suggestions.

Examples:

- Client contact
- Address
- Phone
- Map link
- Work link

---

## 23. Equipment

The app has equipment management.

Equipment records can include:

- Name
- Category
- Icon
- Reference
- Notes
- Archive state

Equipment categories can be created and managed.

Equipment can help answer:

- What tools do we have?
- Which equipment belongs to plumbing?
- What notes exist for a tool?

---

## 24. Equipment Categories

Equipment can be grouped by category.

Examples:

- Plumbing
- Electrical
- Tools
- Measuring devices
- Safety

Categories can have icons and names.

---

## 25. Audit Log

The app has an audit log.

It records important actions such as:

- Project created
- Note created
- Note updated
- AI draft created
- Client archived
- Equipment archived
- Planner assignment created
- Role changed

The audit log can be searched.

This is important for accountability.

---

## 26. Navigation

The app has navigation between:

- Projects
- Planner
- Daily Works
- Teams
- Equipment
- Clients
- Settings
- Audit

The app also has:

- Back behavior
- Forward behavior
- Undo/redo navigation
- Mobile navigation
- Project rail
- Workspace tabs

---

## 27. Mobile Support

The app has mobile-friendly behavior.

Mobile features include:

- Floating plus button
- Quick action sheet
- Compact project rail
- Mobile project list/detail behavior
- Mobile search
- Responsive panels

The goal is that a worker can use the app on site.

---

## 28. Language Support

The app supports language-related behavior.

Current important languages:

- English
- German
- Greek
- Italian

AI Assistant language setting controls:

- Speech recognition language
- AI answer language
- Spoken answer language

The app should answer in the same language as the user.

---

## 29. Theme / Visual Settings

The app includes visual settings and color choices.

Projects can have visual colors.

Service teams can have colors.

Areas can have visual identifiers.

Equipment can have icons.

The design uses panels, rails, cards, tabs, and compact workflows.

---

## 30. Local Data Storage

Current app data is stored in browser local storage.

This means:

- It works locally.
- It is fast for testing.
- It is not yet multi-device production storage.

Production version needs:

- Secure backend
- Database
- Authentication
- File storage
- User accounts
- Backups

---

## 31. Current AI Assistant

The AI Assistant is being refactored into a ChatGPT-style project assistant.

Current direction:

- Normal chat window
- User messages
- Assistant messages
- Voice input
- Typed input
- Project-aware answers
- Save conversation only when the user chooses
- Make resume only when the user chooses
- Leave without saving

The assistant is no longer meant to be only a note formatter.

---

## 32. AI Assistant Data Sources

The AI Assistant should read:

- Project information
- Project details
- Areas
- Area notes
- Area tasks
- Service team notes
- Service team tasks
- Project notes
- Saved AI conversations
- Materials
- Offers
- Problems
- Decisions
- Deadlines
- Chat messages
- Important chat notes
- Documents
- Photos and attachment names

The AI should not invent facts.

If something is missing, it should say what is missing.

---

## 33. AI Assistant Voice Behavior

Current desired behavior:

- If the user types, the assistant types back.
- If the user speaks, the assistant speaks back.
- The assistant should not hear itself.
- The microphone should not send the same question again and again.
- Voice transcript should be cleared after sending.
- The assistant should wait briefly before answering so the user can finish speaking.

---

## 34. AI Assistant Memory

The assistant now needs a learning memory layer.

Memory should store:

- User corrections
- Naming rules
- Project-specific rules
- Company/global rules
- Meaning of special words
- Meaning of area names

Example:

User says:

```text
mpanio1-1 means bathroom 1 on the first floor
```

The assistant should remember:

```text
mpanio = bathroom
NAME - FLOOR
floor 1 = first floor
```

Then next time it should apply that rule automatically.

---

## 35. AI Assistant Learning Types

Memory should be split into:

### Project memory

Rules only for one project.

Example:

```text
In this project, room X means the boiler room.
```

### Company/user memory

Rules that apply everywhere.

Example:

```text
Area names use NAME - FLOOR.
```

### Correction memory

When the assistant makes a wrong answer and the user corrects it.

Example:

```text
No, mpanio2-1 is on the first floor, not the second.
```

The assistant should store and apply the correction.

---

## 36. The Next Important Problem

The AI currently still struggles with floors because the floor is hidden in the area name.

Example area names:

```text
mpanio 4 - 2
mpanio 3 - 2
mpanio2 - 1
mpanio - 1
```

Human meaning:

- `mpanio 4 - 2` = bathroom 4, floor 2
- `mpanio 3 - 2` = bathroom 3, floor 2
- `mpanio2 - 1` = bathroom 2, floor 1
- `mpanio - 1` = bathroom, floor 1

The assistant must not guess this every time.

The app must parse it before AI reasoning.

---

## 37. Tomorrow's First Task: Deterministic Area Parser

Create a function:

```js
function parseAreaName(areaName) {
  const rawName = String(areaName || "").trim();
  const match = rawName.match(/^(.*?)\s*-\s*(\d+)\s*$/);

  const name = match ? match[1].trim() : rawName;
  const floor = match ? match[2].trim() : "";

  const lowerName = name.toLowerCase();

  let roomType = "";
  if (
    lowerName.includes("mpanio") ||
    lowerName.includes("banio") ||
    lowerName.includes("bathroom") ||
    lowerName.includes("μπανιο") ||
    lowerName.includes("μπάνιο")
  ) {
    roomType = "bathroom";
  }

  return {
    rawName,
    name,
    floor,
    roomType,
  };
}
```

This should become the source of truth for AI area understanding.

---

## 38. Deterministic Floor Search

After the parser exists, add local search before the AI call.

If the user asks:

```text
What is on the first floor?
```

The app should find all areas where:

```text
floor === "1"
```

Then send this to AI:

```text
Known first-floor areas:
- mpanio2, bathroom, open
- mpanio, bathroom, open
```

Then AI writes the human answer:

```text
On the first floor there are two bathroom areas: mpanio2 and mpanio. Both are open / not complete.
```

---

## 39. Why This Parser Is Important

This is important because:

- AI is good at language.
- The app is better at exact project data.
- Floors, statuses, IDs, and task counts should be structured before AI sees them.
- AI should explain, not guess.

The correct architecture is:

```text
App parses project data -> App sends structured facts -> AI answers like a human
```

Not:

```text
App sends messy names -> AI guesses
```

---

## 40. Future AI Questions The App Should Answer

The AI should eventually answer:

- What happened in this project?
- What is on the first floor?
- Which bathrooms are still open?
- What materials are missing?
- Who is responsible for the bathroom issue?
- What is still not complete?
- What did the plumber damage?
- Why do we need to replace the bathtub?
- What should I tell the client?
- What should I tell the insurance company?
- What is delayed?
- Which team is free today?
- Which operator is not planned today?
- Which notes mention water damage?
- Which tasks are overdue?
- What was decided in the chat?
- What needs confirmation before sending an offer?

---

## 41. Save Conversation

The AI chat should not save automatically.

The user can click:

```text
Save conversation
```

Then the full chat is saved into project notes.

This is useful when the conversation contains decisions or useful explanations.

---

## 42. Make Resume / Summary

The user can click:

```text
Make resume
```

Then the assistant creates a structured summary of the chat.

The summary should include:

- What happened
- Decisions
- Tasks
- Open points
- Risks
- Next steps

The user can then save it.

---

## 43. Leave Without Saving

The user can leave the AI Assistant without saving.

This is important because not every AI conversation should become a project record.

---

## 44. Current Technical Pieces

Important files:

- `saas-app/index.html`
- `saas-app/appback.js`
- `saas-app/public/appback.js`
- `saas-app/stylesback.css`
- `saas-app/ai-secretary-server.mjs`
- `AI_SECRETARY_SPEC.md`
- `AI_ASSISTANT_REQUIREMENTS.md`
- `START_AI_ASSISTANT_WITH_OPENAI.bat`
- `VERIFY_AI_ASSISTANT.bat`

Important rule:

After editing `saas-app/appback.js`, sync it to:

```text
saas-app/public/appback.js
```

---

## 45. Current AI Server

The local AI server:

```text
ai-secretary-server.mjs
```

provides:

- `/health`
- `/diagnostics`
- `/api/ai-secretary`
- `/api/project-assistant`

The AI server uses:

```text
OPENAI_API_KEY
OPENAI_MODEL
```

Default model:

```text
gpt-4.1-mini
```

---

## 46. Current OpenAI Diagnostics

The project has diagnostics for:

- API key exists
- Model exists
- Authentication works
- Billing/quota
- Organization
- Internet connection
- Tiny test response

There is also:

```text
verify-openai.mjs
```

for direct OpenAI testing.

---

## 47. Production Backend Needed Later

The current app is still local/browser-first.

Production SaaS needs:

- Real backend
- Database
- User accounts
- Secure login
- Role-based backend permissions
- File storage
- AI server deployed securely
- Audit log stored server-side
- Backups
- Billing
- Client/company separation

---

## 48. SaaS Data Model Needed Later

Production should have tables/collections for:

- Companies
- Users
- Roles
- Permissions
- Projects
- Clients
- Areas
- Teams
- Notes
- Tasks
- Files
- Photos
- Chat messages
- Planner assignments
- Daily works
- Equipment
- Audit logs
- AI conversations
- AI memories

---

## 49. AI Memory In Production

Production AI memory should not only live in browser local storage.

It should be saved in backend tables:

- `ai_user_memory`
- `ai_project_memory`
- `ai_company_memory`
- `ai_corrections`

Each memory should include:

- Scope
- Project ID if project-specific
- User ID
- Rule text
- Trigger text
- Meaning
- Created date
- Updated date
- Confidence
- Confirmed by user

---

## 50. Security Notes

Important production rules:

- Never expose OpenAI API key in the browser.
- AI requests must go through secure backend.
- Users must only access project data they are allowed to see.
- AI must not receive data from projects the user cannot access.
- File downloads must be protected.
- Audit log should record important AI actions.

---

## 51. What The App Can Do Today

Today the app can already:

- Create and manage projects
- Assign clients
- Assign project managers
- Create areas
- Create service team folders
- Add notes
- Add files
- Add photos
- Add tasks
- Mark areas complete or open
- Archive and restore records
- Manage clients
- Manage team members
- Manage roles and permissions
- Manage equipment
- Create planner assignments
- Create Daily Works
- Store project chat messages
- Mark chat messages important
- Save AI conversations
- Ask AI project questions
- Connect to OpenAI locally
- Diagnose OpenAI connection problems

---

## 52. What The App Is Becoming

The app is becoming:

```text
A project operating system with an intelligent project secretary.
```

The AI should not only write text.

It should help the company think:

- Understand project status
- Detect missing information
- Explain why something happened
- Find open work
- Prepare client communication
- Prepare insurance explanation
- Prepare offer explanations
- Understand area/floor structure
- Use saved notes and chat history
- Learn from user corrections

---

## 53. Tomorrow's First Development Checklist

Start here:

1. Create or improve `parseAreaName(areaName)`.
2. Parse `NAME - FLOOR`.
3. Recognize `mpanio` as bathroom.
4. Add `floor`, `roomType`, and `parsedName` to every area record.
5. Add a local function:

```js
findAreasByFloor(project, floor)
```

6. Detect floor questions:

```text
first floor
1st floor
protos orofos
πρώτος όροφος
```

7. Before calling AI, build deterministic facts:

```text
Known areas on floor 1:
- mpanio2, bathroom, open
- mpanio, bathroom, open
```

8. Send those facts to AI.
9. Make AI answer from those facts.
10. Test with:

```text
what is on the first floor?
ti exei o protos orofos?
τι έχει ο πρώτος όροφος;
```

Expected answer:

```text
On the first floor there are two bathrooms: mpanio2 and mpanio. Both are open / not complete.
```

---

## 54. Near Future Roadmap

After the parser:

1. Better AI memory confirmation.
2. Show or hide memory rules in settings.
3. Let user delete wrong AI memories.
4. Add project status dashboard.
5. Add "what is missing" intelligence.
6. Add planner intelligence.
7. Add team availability intelligence.
8. Add client message generator.
9. Add insurance report generator.
10. Add offer explanation generator.
11. Add production backend.
12. Add secure deployment.

---

## 55. Very Important Product Principle

The app should not make the user work like a machine.

The app should understand how the company really works.

The user may write:

```text
mpanio2 - 1
```

The app should understand:

```text
Bathroom 2 on the first floor.
```

The user may say:

```text
What happened with the bathroom?
```

The app should search:

- notes
- tasks
- chat
- materials
- area data
- previous AI conversations

Then answer simply.

That is the direction of the product.

