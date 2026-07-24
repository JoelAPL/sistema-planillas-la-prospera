# AGENTS.md

## What this is

Vanilla HTML + CSS + JavaScript payroll system (~40 KB total). No frameworks, no build step, no dependencies, no tests, no linting.

## Run locally

```bash
python -m http.server 8123   # then open http://localhost:8123
```

Or just open `index.html` directly in a browser.

## Architecture

- `index.html` — entry point, loads `app.js` and `styles.css`
- `app.js` — all logic: routing, views, payroll calculations, localStorage persistence
- `styles.css` — all styling
- Data stored in `localStorage` under keys `prospera_empleados`, `prospera_planillas`, `prospera_config`
- Hash-based router (`#/inicio`, `#/personal`, `#/planilla`, etc.)

## Code conventions

- `"use strict"` mode
- Functions and variables in `app.js` are mostly global (attached to `window`)
- UI language is Spanish; code comments are in English
- Currency is Panamanian Balboas (B/.), locale `en-US` for number formatting
- Payroll calculations follow Panamanian labor law (CSS 9.75%/13.25%, SE 1.25%/1.5%, ISR brackets)

## Gotchas

- No build or transpile step — edits to `app.js` are live on refresh
- `localStorage` is per-origin; data won't persist across different ports/origins
- The `SEED` array in `app.js:78` contains demo employees for a university exam; don't delete it
- Print styles hide navigation (`.no-print` class); landscape is default `@page` orientation
