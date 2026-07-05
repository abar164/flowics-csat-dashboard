# Viz Flowics · Support CSAT Dashboard

Modular vanilla-JS dashboard for GitHub Pages. No build step — ES modules load natively.

## Structure

```
index.html          Markup only (semantic, CSS classes, no inline styles)
css/styles.css      Full design system (tokens in :root)
js/
  config.js         Colors, goals, rating taxonomy — change once, applies everywhere
  data.js           MONTHS / DATA / OPS_DATA — the ONLY file automation should touch
  utils.js          Pure helpers (formatters, tally, deltas). No DOM access.
  components.js     Reusable UI components. Each returns an HTML string; no state.
  charts.js         All Chart.js builders (auto-destroy previous instance)
  app.js            State + orchestration + single delegated click handler
```

## Key conventions

- **Data isolation:** the n8n workflow (Google Sheets → GitHub API) should commit
  only `js/data.js`. App logic never needs to change for a data refresh.
- **Interactivity:** components emit `data-act="..."` attributes; `app.js` has one
  delegated listener. Never attach listeners inside components.
- **Styling:** design tokens live in `css/styles.css` (`:root`) and are mirrored in
  `js/config.js` (needed for Chart.js and dynamic colors). Keep both in sync.
- **Security:** all user-derived strings (remarks, names, companies) go through
  `esc()` before insertion.

## Local dev

ES modules require a server (file:// won't work):

```
python3 -m http.server 8000
# → http://localhost:8000
```

## Updating goals

Edit `GOALS` in `js/config.js` (CSAT target, negative-rate ceiling, avg-rating
floor, Fin AI drop alert threshold).
