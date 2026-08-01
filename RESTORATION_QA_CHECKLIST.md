# Restoration QA Checklist

Use this checklist before changing visible functionality.

## Baseline Rule

The UI must stay aligned with `index_v2.html`, `stylesback.css`, `styles-futuristic.css`, and `appback.js`.

## Quick Smoke Test

- Open `saas-app/index.html` through `npm.cmd run dev`.
- Confirm the vertical sidebar appears.
- Confirm `Projects`, `Planner`, `Team Members`, `Equipment`, `Clients`, `Audit Log`, and `Settings` open from the sidebar.
- Confirm `theme=futuristic` still activates futuristic mode.
- Confirm the project rail shows Active, Completed, and Archived projects.
- Confirm opening a project shows the project header, area tabs, team rail, Info tab, Plans, Notes, Files, and Photos.

## Dialogs To Preserve

- Project setup / add project.
- Service Team create/edit.
- Area create/edit/archive/delete confirmation.
- Notes create/edit.
- Files/photos add dialogs.
- Chat room.
- Notification list.
- Equipment create/edit/category dialogs.
- Client create/edit dialogs.
- Member create/edit dialogs.
- Settings dialogs.

## Planner Checks

- Week navigation works.
- 5-day / 7-day switch works.
- Mini calendar remains visible.
- Day cards and project/team planning cards remain visually aligned with the accepted baseline.

## Later Refactor Guardrail

When moving code into modules, migrate one domain at a time and compare against this checklist before continuing.
