# AI Assistant Requirements

The AI Assistant is an added module. It must not replace or redesign the existing project, area, team, planner, file, photo, note, client, equipment, or settings workflows.

## Entry Points

- Main navigation rail: `AI Assistant`
- Project header: small `AI` action connected to the selected project
- Area/material workflow: easy voice action for technicians inside the active project or area

## First Assistant Modes

- Offer draft from speech
- Voice note / project summary
- Material list from speech

## Speech Behavior

Different technicians speak differently. Some pause for a long time while thinking, so the assistant must not stop too quickly.

The user must be able to personalize:

- Pause sensitivity / reaction speed
- Short pause mode
- Normal pause mode
- Long pause mode
- Custom pause time in seconds

The assistant must also support magic words:

- Start recording/listening word, for example `start`
- End recording/listening word, for example `over`
- Alternative end words can be configured later

Example flow:

1. Technician says: `start material list`
2. Technician speaks naturally and can pause
3. Technician says: `over`
4. Assistant summarizes the whole spoken content
5. User chooses where to save it:
   - Project notes
   - Area notes
   - Material list to order
   - Offer draft

## Safety Rules

- AI output is always a draft.
- User must be able to edit before saving/sending.
- Material list should keep unclear items marked as `needs check`.
- Offer drafts should be marked as `Draft - needs review`.

## Future Settings

Add AI Assistant settings later:

- Preferred assistant language
- One assistant language controls both speech input and final output
- Pause mode
- Magic start word
- Magic end word
- Default save target
- Offer template style
- Material wording preference per company/supplier

## Language Rule

The input language and output language are always the same.

There is one setting:

- `Assistant language`

This controls:

- Speech recognition language
- AI understanding language
- Final document/list language
- Magic words

Examples:

- If assistant language is German, the technician speaks German and the offer/material list is written in German.
- If assistant language is Greek, the technician speaks Greek and the offer/material list is written in Greek.
- If assistant language is Italian, the technician speaks Italian and the offer/material list is written in Italian.

The assistant language should be saved per user, not only per company, because different workers in the same company may prefer different languages.
