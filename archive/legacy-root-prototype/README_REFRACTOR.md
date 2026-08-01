# Refactor Notes

## Current Safe Working Files

- Mobile page: `index_v2_mobile.html`
- Shared app logic: `appback.js`
- Desktop/shared styles: `stylesback.css`
- Mobile CSS entry: `css/mobile.css`
- Mobile legacy CSS: `css/mobile/legacy.css`
- New mobile fixes: `css/mobile/overrides.css`

## Rule Going Forward

Do not add new mobile CSS inside `index_v2_mobile.html`.

Add mobile layout fixes to:

- `css/mobile/shell.css`
- `css/mobile/navigation.css`
- `css/mobile/projects.css`
- `css/mobile/planner.css`
- `css/mobile/modals.css`
- `css/mobile/overrides.css`

Keep `appback.js` unchanged until we split one feature at a time.

