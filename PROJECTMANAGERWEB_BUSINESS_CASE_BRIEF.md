# ProjectManagerWeb - Business Case Brief

This document is written for a person who should prepare a business case, investor case, grant application, product strategy, or go-to-market plan for ProjectManagerWeb.

It explains the product idea, target market, customer problem, value proposition, current product scope, AI direction, monetization potential, and open questions.

---

## 1. Executive Summary

ProjectManagerWeb is a SaaS-style project management platform for construction, renovation, installation, maintenance, and field-service companies.

The product combines:

- project management
- site documentation
- team planning
- client and contact management
- task tracking
- notes, photos, files, and chat
- AI project assistant connected to saved project data

The long-term vision is to become a practical "project operating system" for small and mid-sized companies that manage many construction or service projects at the same time.

The key innovation is the AI Assistant:

It should work like ChatGPT, but with access to the selected project's notes, tasks, materials, areas, conversations, files, deadlines, problems, and decisions.

The assistant should not only generate text. It should help the company understand what is happening in a project.

---

## 2. Product Vision

The product vision:

```text
A project operating system with an intelligent project secretary.
```

The app should help users answer questions such as:

- What happened in this project?
- What is still open?
- Why do we need to replace this item?
- Which materials are missing?
- Who is responsible?
- What should we tell the client?
- What should we tell the insurance company?
- Which team is available?
- Which areas are complete?
- Which areas are still open?
- What is on the first floor?
- What was decided in the chat?

The app should reduce lost information between office, workers, subcontractors, clients, and managers.

---

## 3. Customer Problem

Many construction and service companies have the same operational problems:

- Information is scattered across WhatsApp, phone calls, notebooks, photos, emails, and memory.
- Workers report information verbally, but it is not structured.
- Project managers spend time asking the same questions again.
- Important site problems are forgotten or misunderstood.
- Materials are ordered late or with unclear quantities.
- Offers are delayed because the scope is unclear.
- Clients ask questions and the company must search manually through notes.
- Responsibility is unclear.
- Project history is difficult to reconstruct.
- Photos and files are stored without context.
- Planning teams and workers is manual and error-prone.
- Small companies cannot afford complex enterprise construction software.

ProjectManagerWeb tries to solve this with a practical workflow and an AI assistant that understands project data.

---

## 4. Target Customers

Primary target customers:

- small construction companies
- renovation companies
- plumbing companies
- electrical companies
- HVAC companies
- painting companies
- facility maintenance teams
- general contractors with subcontractors
- project managers handling many small/medium projects

Secondary target customers:

- property management companies
- insurance repair companies
- installation/service companies
- companies that need photo-based site documentation

Company size:

- 3 to 50 workers is the likely first target.
- Later the product can scale to larger teams.

Best early adopter:

A company where the owner/project manager personally suffers from project information chaos and wants a practical tool, not a heavy enterprise system.

---

## 5. User Personas

### Company Owner

Needs:

- know project status quickly
- reduce mistakes
- see open work
- understand costs and delays
- communicate clearly with clients

Value:

- less chaos
- fewer forgotten tasks
- faster decisions
- better client trust

### Project Manager

Needs:

- manage many projects
- schedule teams
- track notes/tasks/photos/files
- answer client questions
- prepare offers and explanations

Value:

- less time searching
- better documentation
- AI support for summaries and communication

### Field Worker / Technician

Needs:

- quickly report what happened
- upload photos
- create notes by voice
- see assigned tasks
- avoid complicated forms

Value:

- less typing
- simple mobile workflow
- voice input

### Office Assistant / Secretary

Needs:

- organize project information
- prepare client updates
- search project history
- support billing/insurance/offer preparation

Value:

- AI helps transform messy notes into usable summaries

### Client / External Stakeholder

Possible future user.

Needs:

- project updates
- clear documentation
- photos/proof
- status reports

Value:

- transparency
- trust

---

## 6. Value Proposition

ProjectManagerWeb helps project-based service companies:

- keep all project information in one place
- document work with notes, tasks, files, photos, and chat
- plan teams and daily work
- manage clients and equipment
- understand project status faster with AI
- turn messy field information into clear project knowledge
- reduce repeated questions
- reduce forgotten tasks
- improve client communication

Simple value statement:

```text
ProjectManagerWeb gives small construction and service companies one place to manage projects, teams, site documentation, and AI-powered project knowledge.
```

AI value statement:

```text
The AI Assistant acts like a practical project secretary that reads the saved project data and answers project questions in simple language.
```

---

## 7. Key Differentiator

Many project management tools store tasks and files.

The differentiator is:

```text
AI connected to real project context.
```

The assistant should be able to answer:

- based on saved notes
- based on tasks
- based on areas
- based on materials
- based on conversations
- based on photos/files metadata
- based on project-specific memory
- without inventing facts

Example:

User asks:

```text
Why do we need to replace the bathtub?
```

Assistant answer:

```text
The saved notes say there was a bathroom flood.
A pipe was drilled accidentally.
Water entered the bathroom and caused damage.
The bathtub replacement is mentioned as a required next step.
Please confirm whether the bathtub itself was damaged before ordering.
```

This is more valuable than a generic AI chatbot because it uses the company's project data.

---

## 8. Current Product Modules

The prototype/app already includes these product areas.

### Projects

- create projects
- project number
- project name
- client
- project manager
- start date
- end date
- lifecycle/status
- active/completed/archived project lists
- custom project color

### Project Workspace

- project details
- plans
- areas
- tasks
- service teams
- chat
- notes/files/photos/tasks inside project areas

### Areas

- create project areas
- area tabs
- area notes
- area files
- area photos
- area tasks
- area completion/open status
- archived areas

Important current improvement needed:

Area names like `mpanio2 - 1` must be parsed into structured data:

- name: mpanio2
- type: bathroom
- floor: 1

### Service Teams / Folders

- project-specific teams/folders
- team notes
- team files
- team photos
- team tasks
- team member links

### Notes

- project notes
- area notes
- team notes
- checklist notes
- notes with images
- notes visible on master plan

### Files And Photos

- file upload
- photo upload
- camera/photo workflow
- attachment storage in project context
- chat attachments

### Tasks

- task title
- task notes
- status
- assignee
- due date
- team/area/project context

### Project Chat

- project room
- team room
- direct member chat
- attachments
- important messages can become notes

### Planner

- week view
- day view
- hourly/2h/4h slots
- team assignment
- project assignment
- notes
- edit/delete assignments

### Daily Works

- daily work records
- date/time
- client/contact
- address
- phone
- map link
- work link
- assigned members
- notes
- status

### Clients

- client/person/company details
- UID
- address
- email
- phone
- responsible persons
- archive/delete

### Team Members

- member records
- roles
- permissions
- qualifications/work mode
- project/team involvement

### Permissions

- role-based access
- permission checks
- elevated permissions
- user/role management

### Equipment

- equipment categories
- equipment items
- icons
- references
- notes
- archive/delete

### Audit Log

- action history
- searchable audit events
- records project/client/equipment/planner/user actions

### AI Assistant

- ChatGPT-style assistant window
- typed messages
- voice messages
- answers from project data
- save conversation
- make resume
- leave without saving
- OpenAI local server connection
- diagnostics and health checks

---

## 9. AI Assistant Direction

The AI Assistant should become the main intelligence layer.

It should:

- answer project questions
- use saved project data
- read notes/tasks/materials/conversations/offers/documents/problems/decisions/deadlines
- use project area structure
- use memory rules
- say when information is missing
- show contradictions
- avoid inventing facts
- answer in the user's language
- speak only when the user used voice
- type only when the user typed

It should feel like:

```text
ChatGPT for this project.
```

Not:

```text
A fixed note formatter.
```

---

## 10. AI Learning Memory

The planned AI memory should learn from the user.

Example:

User says:

```text
mpanio1-1 means bathroom 1 on the first floor
```

The assistant should store:

```text
mpanio = bathroom
NAME - FLOOR
floor 1 = first floor
```

Memory types:

- project memory
- company/user memory
- correction memory

This avoids needing to train a model from scratch.

The app can build a memory layer around OpenAI.

---

## 11. Immediate Technical Gap

The current most important technical gap is structured project understanding.

Example:

The app visually shows area tabs:

```text
mpanio 4 - 2
mpanio 3 - 2
mpanio2 - 1
mpanio - 1
```

Humans understand:

- `mpanio 4 - 2` = bathroom 4 on floor 2
- `mpanio 3 - 2` = bathroom 3 on floor 2
- `mpanio2 - 1` = bathroom 2 on floor 1
- `mpanio - 1` = bathroom on floor 1

The AI must not guess this from text.

The app should parse it first.

---

## 12. Next Development Step

Build a deterministic parser:

```js
parseAreaName("mpanio2 - 1")
```

returns:

```json
{
  "rawName": "mpanio2 - 1",
  "name": "mpanio2",
  "floor": "1",
  "roomType": "bathroom"
}
```

Then add local floor search:

```js
findAreasByFloor(project, "1")
```

returns:

```json
[
  {
    "name": "mpanio2",
    "floor": "1",
    "roomType": "bathroom",
    "status": "open"
  },
  {
    "name": "mpanio",
    "floor": "1",
    "roomType": "bathroom",
    "status": "open"
  }
]
```

Then the AI can answer:

```text
On the first floor there are two bathroom areas: mpanio2 and mpanio.
Both are open / not complete.
```

This should be the next programming task.

---

## 13. Business Problem Solved

The business problem is not just "task management".

The deeper problem is:

```text
Project knowledge is lost, scattered, misunderstood, or not available when decisions are needed.
```

ProjectManagerWeb solves this by:

- collecting project information
- structuring it
- connecting it to teams/areas/tasks
- allowing voice and mobile input
- using AI to answer questions and create summaries

---

## 14. Business Value

Potential measurable value:

- fewer missed tasks
- less time searching for information
- faster project updates
- faster offer preparation
- better client communication
- better damage/insurance documentation
- fewer misunderstandings between office and field
- less dependency on one person's memory
- better planning of workers/teams

Possible business KPI examples:

- reduce project-manager search time by 30 percent
- reduce forgotten open items
- reduce time to create client update from 30 minutes to 3 minutes
- reduce repeated calls between office and technicians
- increase quality of project documentation

---

## 15. Monetization Ideas

Possible SaaS pricing models:

### Per company per month

Example:

- Basic: small team, limited projects
- Pro: more projects, AI assistant, planner
- Business: roles, audit, advanced AI memory

### Per user per month

Example:

- Office user
- Field user
- Admin user

### Per active project

Useful for construction companies with many archived projects.

### AI usage add-on

Because AI costs money, charge separately for:

- AI assistant usage
- voice transcription
- document generation
- advanced summaries

### White-label / industry version

For companies that want their own branded project portal.

---

## 16. Possible Pricing Hypothesis

This is only a starting hypothesis for business-case work.

Example:

- Starter: 29-49 EUR/month
- Team: 99-149 EUR/month
- Business: 249-499 EUR/month
- AI add-on: usage based or included up to a limit

Business-case author should validate:

- willingness to pay
- number of users per company
- AI cost per company
- support cost
- onboarding effort

---

## 17. Market Positioning

Possible positioning:

```text
ProjectManagerWeb is a simple AI-powered project management system for construction and service companies that need practical site documentation, team planning, and project memory.
```

Alternative positioning:

```text
An AI project secretary for small construction companies.
```

Strongest positioning:

```text
Your project data, notes, photos, tasks, and conversations in one place - with an AI assistant that can answer what happened and what is still open.
```

---

## 18. Competitor Categories

Business-case author should compare against:

- generic project tools: Trello, Asana, Monday
- construction software: Procore, PlanRadar, Buildertrend, Fieldwire
- messaging tools: WhatsApp, Teams
- document storage: Google Drive, Dropbox
- scheduling tools
- AI chat tools: ChatGPT, Copilot

Potential differentiation:

- simpler than enterprise construction software
- more project-context-aware than generic ChatGPT
- more practical for small field-service teams
- combines voice notes, project data, and AI memory

---

## 19. MVP Definition

Minimum viable product should include:

- Projects
- Clients
- Areas
- Notes
- Photos/files
- Tasks
- Team members
- Basic planner
- AI Assistant connected to project data
- Save AI conversation
- Make AI summary
- Area parser/floor understanding
- Secure backend
- User login
- Basic roles

MVP should avoid too many advanced features at first.

The strongest MVP story:

```text
Ask your project: What happened? What is still open? What should I tell the client?
```

---

## 20. Technical Risks

Risks:

- AI may hallucinate if data is not structured.
- Voice recognition can vary by browser/device/language.
- Local storage is not production-safe.
- File storage needs secure backend.
- Permissions must be enforced server-side in production.
- AI costs must be controlled.
- Onboarding construction companies may require support.

Mitigation:

- structured data before AI
- deterministic parsers
- AI diagnostics
- source-aware answers internally
- user review before saving/sending
- backend access control
- usage limits

---

## 21. Product Risks

Risks:

- Users may not want to enter data.
- Field workers may resist complicated workflows.
- Too many features can make the app feel heavy.
- AI must be trustworthy.
- If AI gives wrong project answers, trust drops quickly.

Mitigation:

- mobile-first simple input
- voice input
- quick photo/note capture
- AI says when information is missing
- AI never invents facts
- keep workflows practical and simple

---

## 22. Go-To-Market Ideas

Possible early market approach:

1. Start with 2-5 friendly construction/service companies.
2. Observe how they currently manage project information.
3. Focus on one painful workflow:
   - site notes to client update
   - bathroom damage documentation
   - material list generation
   - project status summary
4. Build a case study.
5. Charge a pilot fee or discounted subscription.
6. Use feedback to define the paid MVP.

Good first pitch:

```text
Stop searching through WhatsApp and notes. Ask your project what happened, what is open, and what to tell the client.
```

---

## 23. Implementation Phases

### Phase 1 - Prototype Stabilization

- clean project chat UI
- deterministic area parser
- floor/room understanding
- AI memory improvements
- prevent repeated voice messages
- improve project-data retrieval

### Phase 2 - MVP Backend

- authentication
- database
- file storage
- secure API
- role enforcement
- project/company separation

### Phase 3 - AI Project Intelligence

- structured retrieval layer
- project memory
- user/company memory
- client message generator
- insurance report generator
- offer explanation generator
- project status summary

### Phase 4 - Pilot

- test with real company
- collect feedback
- measure time saved
- improve mobile workflows
- define pricing

### Phase 5 - SaaS Launch

- onboarding
- billing
- support
- backups
- monitoring
- documentation
- deployment

---

## 24. Questions For Business Case Author

The business-case author should answer:

1. Which exact customer segment should be first?
2. What is the strongest pain point?
3. What is the first paid MVP?
4. How much would a small company pay?
5. Is pricing better per company, per user, or per project?
6. What competitor is closest?
7. What features are must-have for launch?
8. What features should be delayed?
9. What legal/security requirements apply?
10. What AI cost per customer is acceptable?
11. How much onboarding support is needed?
12. What measurable ROI can be promised?

---

## 25. One-Sentence Business Case

ProjectManagerWeb helps small construction and service companies manage projects, teams, documentation, and client communication in one place, with an AI assistant that understands saved project data and turns messy field information into clear answers and next steps.

---

## 26. Most Important Next Step

Before building more AI features, fix structured area understanding.

Next technical task:

```text
Create deterministic area parser and floor search.
```

Why:

If the app itself understands:

```text
mpanio2 - 1 = bathroom 2 on floor 1
```

then AI answers become reliable.

This is the foundation for trustworthy project intelligence.

