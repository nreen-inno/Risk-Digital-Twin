# Risk Digital Twin — First Experience

The landing / onboarding screen for the **Risk Digital Twin** platform — an
AI-powered enterprise risk intelligence product for a global shipyard.

This is **not** a dashboard, a risk register or a reporting screen. It is the
*beginning of configuring the platform*: the user declares a **Monitoring
Objective** in plain business language ("what would you like to monitor?"), and
the platform will later recommend the enterprise risks, information sources and
connector configuration behind the scenes. The internal risk ontology is never
exposed to the user.

## Tech stack

- **React 18 + Vite**
- **JavaScript** (no TypeScript)
- Plain CSS **design system** (`src/styles/design-system.css`) — tokens first,
  restrained enterprise palette, soft layered shadows, subtle motion.
- All REST calls centralized in **`src/services/api.js`**.

## Backend

The backend already exists and is **not** part of this project. The app talks to
it over REST only.

| Setting | Value |
|---|---|
| Base URL | `VITE_API_BASE_URL` (default `http://localhost:3000`) |
| Objectives endpoint | `GET /api/monitoring-capabilities` |

Configure the base URL in `.env`:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

Nothing is hardcoded — objectives are always loaded from the API and normalized
into a stable view-model (`normalizeObjective`) that tolerates reasonable
variation in the backend's field names and source grouping.

## Getting started (VS Code)

```bash
npm install
npm run dev      # http://localhost:5174
npm run build
npm run preview
```

Open the folder in Visual Studio Code. With the backend running on
`http://localhost:3000`, the four objective cards populate from the API.

## What the screen does

- **Hero** — "What would you like to monitor?" in business language.
- **Objective cards** (responsive 2×2) — each shows an icon, title, business
  question, description, related risk factors, and suggested information sources
  grouped into **Internal / External / Historical** tiers.
- **Selection** — click a card, press its **Select** button, or focus it and
  press **Enter / Space** (full keyboard accessibility; the grid is an ARIA
  radiogroup).
- **Create Custom Monitoring Objective** — dashed invitation card; activating it
  shows a calm "coming in the next iteration" message.
- **Selected Monitoring Objective panel** — restates the business question,
  counts the suggested sources, and offers **Continue** (which currently
  announces that source selection is implemented next — no navigation yet).
- **States** — first-class `loading` (skeleton grid), `empty`,
  `backend-unavailable` and generic `error` surfaces, each with a **retry**.

## Structure

```
src/
  pages/
    MonitoringObjectivesPage.jsx   page-level composition
  components/
    layout/                        app-wide chrome (reused by future pages)
      TopBar.jsx  Footer.jsx
    shared/                        generic reusable UI
      Button.jsx  Toast.jsx
      LoadingState.jsx  EmptyState.jsx  ErrorState.jsx
    monitoring-objectives/         feature-specific components
      Hero.jsx  MonitoringObjectiveCard.jsx  CustomObjectiveCard.jsx
      SelectedObjectivePanel.jsx  SourceGroup.jsx
  hooks/
    useMonitoringObjectives.js     loading/empty/error/ready state machine + reload
  services/api.js                  centralized REST + ApiError + normalization
  lib/icons.jsx                    professional inline-SVG icon set
  styles/design-system.css         tokens + primitives (buttons, chips, surfaces)
  index.css                        screen composition (hero, cards, panel, states)
  App.jsx                          minimal — renders the page
  main.jsx                         React root
```

The structure is intentionally scalable: future pages (Information Sources,
Connector Analysis, Risk Dashboard) become new files under `pages/` with their
own folders under `components/`, reusing everything in `layout/` and `shared/`.

## Scope (intentionally stops here)

No dashboards, authentication, routing beyond this page, backend changes, AI
calls, connector execution, or risk visualizations. This is the first
experience only.
