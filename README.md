# Capstone 2.0 Perceptual Drift Planner

Local-first web app for visualizing Capstone 2.0 segment drift on a Size vs Performance perceptual map across 4 rounds, adding/editing products, and evaluating product-segment fit over time.

## Deploy (Render)
- One-click deploy: [Deploy to Render](https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Fmr-darksoul%2Fcapsim-perceptual-drift-planner)
- The repo includes `render.yaml` with:
  - Build command: `npm install`
  - Start command: `npm start`
  - Health check: `/api/health`

## Prerequisites
- Node.js 18+

## Install
```bash
npm install
```

## Run
```bash
npm start
```

## Open
- [http://localhost:3000](http://localhost:3000)

## Test
```bash
npm test
```

## Features
- Month-by-month drift slider (48 months across 4 rounds) + round dropdown + play/pause animation.
- Segment drift model with:
  - start center (size, performance)
  - drift per round (delta size, delta performance)
  - per-round override table (fine-tune)
- Product modeling with:
  - create/edit/delete
  - existing/proposed tag
  - color + icon
  - start position
- Fit insights for selected month:
  - Euclidean distance to each segment
  - nearest segment and nearest distance
  - optional distance lines from selected product
- Scenario support:
  - baseline drift preset
  - aggressive drift preset (ideal-spot trajectory overrides)
  - import/export full scenario JSON
- Local persistence via `localStorage`.
- Input validation and error display for invalid edits/imports.

## API Endpoints
- `GET /api/health` → `{ "status": "ok" }`
- `GET /api/presets` → `{ "presets": [Scenario, Scenario] }`
- `POST /api/scenario/validate` → `{ "valid": boolean, "errors": string[], "normalizedScenario": Scenario|null }`

## Scenario Notes
- Chart bounds are fixed to `0..20` for Size and Performance.
- Rounds are fixed to `4`.
- Segment center coordinates are treated as **end-of-year** values for each round.
- Month interpolation runs from previous year-end center to current year-end center.
- Round 1 starts in **2026**.
- Monthly drift assumes linear interpolation: `yearly drift / 12`.
- Import behavior is **replace current scenario on valid import**.

## How To Use
1. Pick scenario.
2. Adjust segment drift/overrides.
3. Add/edit existing and proposed products.
4. Scrub rounds or press play.
5. Read nearest-segment fit table and distances.
6. Export/import scenario JSON.

## Project Structure
```text
Capsim/
  package.json
  server.js
  README.md
  data/
    presets.json
  lib/
    constants.js
    fit.js
    model.js
    validation.js
  public/
    index.html
    styles.css
    js/
      app.js
      chart.js
      constants.js
      fit.js
      importExport.js
      model.js
      state.js
      storage.js
      ui.js
      validation.js
  tests/
    api.test.js
    fit.test.js
    model.test.js
    validation.test.js
```
