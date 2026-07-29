# Frontend Sprint – Monitoring Objective Workspace Redesign

## Context

Continue development of the existing **Risk Digital Twin** frontend.

Use the code currently open in this local Git workspace as the only source of truth.

The repository already contains the latest frontend and backend from `main`.

Before making changes, verify the current branch:

```bash
git branch --show-current
```

Work only on the active frontend development branch.

Do not switch branches.

Do not initialise a new Git repository.

Do not create a new React/Vite project.

Do not modify backend files.

Do not modify repository structure.

Do not commit.

Do not push.

Work only inside:

`frontend/`

---

# Goal

Redesign the Monitoring Objectives workflow so that the Monitoring Objective is the main object the user opens and manages.

AI recommendations must remain optional.

The user must be able to:

1. Open a Monitoring Objective directly.
2. See Sources in use.
3. See Sources still in setup.
4. Ask AI for additional suggestions only when needed.
5. Add a source manually without using AI.
6. Open an existing source for business access, connector guidance and later connector configuration.

The UI must clearly separate:

- current sources;
- setup in progress;
- AI suggestions.

Do not mix these concepts.

---

# Existing Backend Endpoint

## Load Information Sources for one Monitoring Objective

**GET**

`/api/monitoring-capabilities/:id/information-sources`

Example:

```json
{
  "monitoringObjectiveId": "supplier-stability",
  "sources": {
    "active": [
      {
        "id": "...",
        "name": "Dun & Bradstreet supplier risk insights",
        "status": "active",
        "provider": "Dun & Bradstreet",
        "sourceKind": "commercialService",
        "connectorStatus": "notConfigured"
      }
    ],
    "draft": [
      {
        "id": "...",
        "name": "EU Official Sanctions Information",
        "status": "draft",
        "provider": "European Union",
        "sourceKind": "publicService",
        "connectorStatus": "notConfigured"
      }
    ],
    "disabled": []
  },
  "counts": {
    "active": 1,
    "draft": 1,
    "disabled": 0
  }
}
```

Use this endpoint as the source of truth for:

- Sources in use
- Setup in progress
- Disabled sources
- Card counts

Do not hardcode source counts.

---

# Monitoring Objective Cards

Replace `Suggested Sources` with `Sources in use`.

Use `counts.active` from the backend endpoint.

Optionally also show:

`1 in use · 1 setup in progress`

using:

- `counts.active`
- `counts.draft`

Do not count AI recommendations here.

---

# Remove the dark blue bottom selection bar

The current bottom action bar is unnecessary because only one Monitoring Objective can be opened at a time.

Remove the dark-blue selected-objective action bar.

Make the whole Monitoring Objective card clickable.

Add a subtle action inside the card such as:

`Open objective →`

The card should have:

- hover state;
- keyboard accessibility;
- visible focus state;
- clear selected/open interaction.

Clicking the card must open the Monitoring Objective workspace.

Do not automatically run AI when the card opens.

---

# Monitoring Objective Workspace

Create or refactor a page for one Monitoring Objective.

Suggested route:

`/monitoring-objectives/:id`

Use the existing routing architecture if a similar route already exists.

The workspace should display:

- Objective name
- Business question
- Description
- Related risk factors if already available
- Source counts

Then show three main tabs:

1. **Sources in use**
2. **Setup in progress**
3. **AI suggestions**

Tabs are preferred because they keep the page clean.

---

# Tab 1 – Sources in use

Show Information Sources from `sources.active`.

Each source card should display:

- Source name
- Provider
- Source kind
- Information need, if available
- Connector status
- Lifecycle status: `In use`

Available actions:

- Open
- Review source
- Review access
- Connector setup
- Disable

Some actions may navigate to the existing Source Details page.

Do not show AI recommendation controls on these cards.

Do not invent coverage-fit values such as Strong or Partial unless the backend explicitly provides them.

---

# Tab 2 – Setup in progress

Show Information Sources from `sources.draft`.

Each card should display:

- Source name
- Provider
- Availability
- Information need
- Business access status, if available
- Connector status
- Lifecycle status: `Setup in progress`

Available actions:

- Continue setup
- Review access
- View AI connector advice

Use the existing Source Details page for continuation where possible.

---

# Disabled Sources

Disabled sources do not need a primary tab unless this fits the current layout.

A compact expandable section is sufficient:

`Disabled sources`

Use `sources.disabled`.

Actions may include:

- Re-enable
- Open

Do not overemphasise disabled sources.

---

# Tab 3 – AI Suggestions

AI must be optional.

Do not run AI automatically when the Monitoring Objective workspace opens.

Initial state:

```text
Need additional monitoring coverage?

Ask AI to analyse gaps and recommend relevant information sources.
```

Primary action:

`Ask AI for suggestions`

Secondary action:

`Add source manually`

Only after the user clicks **Ask AI for suggestions** should the frontend call the existing Source Advisor endpoint.

Reuse the existing AI Source Advisor implementation and components where possible.

Do not create a second recommendation system.

---

# Existing AI Source Advisor Endpoint

**POST**

`/api/monitoring-capabilities/:objectiveId/source-recommendations`

Use the existing request and normalization logic.

The response may include:

- coverageAssessment
- recommendations
- summary
- assumptions

---

# Clear terminology

## Existing source

Use:

- `In use`
- `Setup in progress`
- `Disabled`
- `Current source`

## AI recommendation

Use:

- `Suggested`
- `AI suggestion`
- `Recommendation relevance`
- `High priority`
- `Medium priority`
- `Low priority`

Do not label an existing source as `Suggested`.

Do not label an AI suggestion as `In use`.

---

# Strong / Partial / Missing issue

The current page mixes existing monitoring coverage and recommendation relevance.

Fix this.

## Existing sources

Do not display `Strong`, `Partial` or `Missing` unless the backend provides an explicit source-fit field.

For now display:

- lifecycle status;
- provider;
- source kind;
- information need;
- connector status.

## AI coverage assessment

Coverage Assessment may still show:

- Strong
- Partial
- Missing
- Unknown

But make it explicit that this refers to:

`Current monitoring coverage by information need`

## AI recommendations

For recommendations, use priority/relevance wording rather than coverage wording.

Do not reuse the same coverage badge for recommendation quality.

---

# Recommendation actions

For AI recommendations, support:

- Accept
- Reject
- Decide later

Do not use `Ignore`.

## Accept

Persist through:

`POST /api/information-sources/from-recommendation`

Treat both `created: true` and `duplicate: true` as successful.

After Accept:

- refresh objective Information Sources;
- move the source into `Setup in progress`;
- show confirmation;
- allow opening Source Details.

## Reject

For this sprint, rejection may remain local UI state if no backend decision endpoint exists yet.

Do not pretend rejection is persisted if it is not.

## Decide later

Keep the recommendation available.

This is not negative feedback.

---

# Add Source Manually

Add a visible action:

`Add source manually`

This should not invoke AI.

For this sprint, it can:

- open a simple form using existing InformationSource fields; or
- open a placeholder workflow if manual creation is not yet fully supported.

Use the existing:

`POST /api/information-sources`

if practical with the current API.

Do not create backend changes.

---

# Source Details Integration

Existing active or draft sources should open the existing Source Details workflow.

Reuse the current page that supports:

- Business Access Review
- Access Guidance
- AI Connector Advisor

Do not duplicate these forms inside the Monitoring Objective workspace.

The workspace is an overview and navigation layer.

---

# API Layer

All network calls must remain in:

`frontend/src/services/api.js`

Components must not call `fetch()` directly.

Add a reusable function for:

`GET /api/monitoring-capabilities/:id/information-sources`

Suggested name:

```javascript
getMonitoringObjectiveInformationSources(objectiveId, options)
```

Reuse existing `ApiError` handling.

Add a hook if consistent with the current architecture, for example:

`useMonitoringObjectiveSources.js`

Handle:

- loading;
- backend offline;
- empty active sources;
- empty draft sources;
- retry;
- refresh after accepting a recommendation.

---

# Suggested Components

Reuse existing components where possible.

Possible new or updated components:

- `MonitoringObjectiveCard`
- `MonitoringObjectiveWorkspacePage`
- `ObjectiveSourcesSummary`
- `ObjectiveSourcesTabs`
- `CurrentSourceCard`
- `DraftSourceCard`
- `DisabledSourcesSection`
- `AiSuggestionsPanel`
- `AddSourceMenu`

Do not create a new design system.

Keep components focused and maintainable.

---

# Visual Requirements

Preserve the current premium enterprise look and feel.

The workspace should communicate:

> This Monitoring Objective is already being monitored by these sources. Additional AI support is available when needed.

Avoid:

- a persistent bottom action bar;
- automatic AI execution;
- mixed source and recommendation cards;
- dense technical forms;
- raw JSON;
- ambiguous status badges.

Use progressive disclosure.

---

# Back Navigation

Provide clear navigation:

`Monitoring Objectives → Selected Objective → Source Details`

The user must be able to return from:

- Source Details to the Monitoring Objective workspace;
- Monitoring Objective workspace to the Monitoring Objectives overview.

Preserve existing back-navigation fixes.

---

# Scope Rules

Do not modify:

- `backend/`
- backend API contracts
- Cosmos DB model
- repository structure
- Git branches

Do not commit.

Do not push.

Do not create a new package.json.

Only modify package dependencies if genuinely necessary. Prefer existing dependencies.

---

# Validation

Before finishing:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Verify:

1. Monitoring Objectives page loads.
2. Cards display `Sources in use`, not `Suggested Sources`.
3. Counts come from the backend.
4. Dark-blue selection bar is removed.
5. Entire card opens the Monitoring Objective workspace.
6. Opening an objective does not automatically call AI.
7. Sources in use display only active sources.
8. Setup in progress displays only draft sources.
9. AI Suggestions loads only after user action.
10. Add source manually is visible.
11. Accepting a suggestion refreshes Setup in progress.
12. Existing Source Details workflow still works.
13. No browser-console errors are introduced.
14. `npm run build` succeeds.

---

# Deliverables

Return:

1. Changed files
2. Component tree
3. API functions and hooks added
4. Routes added or changed
5. UX decisions
6. Assumptions
7. Remaining placeholders

Do not commit.

Do not push.
