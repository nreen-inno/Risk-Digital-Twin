# Claude Prompts for the Risk Digital Twin Frontend

This file contains reusable instructions for Claude or Claude Code when working in the Risk Digital Twin repository.

## 1. General Repository Guardrails

Use this at the beginning of any Claude Code task:

```text
You are working inside an existing monorepo named Risk-Digital-Twin.

Repository structure:

- backend/ contains the existing Node.js and Express backend.
- frontend/ contains the existing React and Vite frontend.
- docs/ contains architecture and product documentation.

Rules:

1. Do not create another repository.
2. Do not create another frontend or backend application.
3. Do not create another package.json unless explicitly requested.
4. Do not run npm init.
5. Do not replace the root repository structure.
6. Do not modify backend/ unless I explicitly ask for backend changes.
7. Use plain JavaScript, not TypeScript.
8. Preserve the existing design system, logo, header, navigation and responsive behaviour.
9. Keep REST calls centralized in frontend/src/services/.
10. Use VITE_API_BASE_URL for the backend base URL.
11. Do not commit node_modules, dist or .env files.
12. Before editing, inspect the existing files and explain the minimum changes required.
13. After editing, run npm run build in frontend/.
14. Fix build and import errors before stopping.
15. Do not commit, push or merge unless I explicitly request it.
```

---

## 2. Product and Business Context

Use when Claude needs the correct product meaning:

```text
The product is called Risk Digital Twin.

It is an AI-powered enterprise risk intelligence platform for industrial companies.

The platform combines internal, external and historical information, uses AI-assisted semantic integration, and transforms the data into traceable enterprise risk intelligence.

Important terminology:

- Monitoring Objective is the user-facing answer to “What does the organisation want to monitor?”
- Monitoring Objective is not the same as Enterprise Risk Category.
- Enterprise Risk Categories remain the formal governance, reporting and filtering taxonomy.
- A Monitoring Objective may relate to several Risk Factors, Risk Definitions and Enterprise Risk Categories.
- Risk Factors such as weather, sanctions, commodity prices and supplier capacity are not Information Sources.
- Information Sources are concrete systems or providers such as ERP, FMI, European Commission news, an RSS feed, a CSV export or a historical incident database.
- One Monitoring Objective may use several internal, external and historical Information Sources.
- AI analyses a source and proposes technical connector configuration, semantic mapping, missing information, assumptions and confidence.

Main customer workflow:

Monitoring Objective
→ Information Sources
→ AI Connector Analysis
→ Connector Definition
→ Connector Instance
→ Raw Records
→ Knowledge Objects
→ Risk Intelligence Dashboard

The demo should look like a premium industrial AI platform, not a CRUD application or student project.
```

---

## 3. Frontend Design Direction

```text
Act as a senior enterprise UX designer and senior React developer.

The UI is being demonstrated to executives from a major shipyard and potentially to investors.

The visual goal is a premium industrial AI platform with a clear WOW effect.

Reference qualities:

- Microsoft Fabric
- Azure Portal
- Palantir Foundry
- Siemens industrial software
- modern operational intelligence platforms

Use:

- elegant typography
- generous spacing
- restrained navy, blue and cyan accents
- subtle gradients
- high-quality icons
- calm animations
- strong visual hierarchy
- responsive layouts
- accessible focus and contrast
- clear AI explanations and traceability

Avoid:

- generic Bootstrap appearance
- childish rounded elements
- excessive colours
- excessive animations
- dense forms
- decorative effects that reduce usability
- dashboards that look like unrelated collections of charts

The UI should communicate:

- Enterprise AI
- Industrial Operations
- Risk Intelligence
- Internal and External Data Integration
- Traceability and Trust
```

---

## 4. Implement Information Sources Page

```text
You are working inside the existing frontend/ React and Vite application.

Do not create another app, backend, package.json or Vite configuration.

Implement the next page in the Configure workflow:

Information Sources Page

Purpose:

After a user selects a Monitoring Objective, show the internal, external and historical Information Sources that may support that objective.

The page must preserve the current premium design system and existing application header.

Business logic:

Monitoring Objective is the business entry point.
Information Sources are concrete systems, services, feeds, files or people that provide evidence.
Weather, politics, commodity prices and supplier stability are not sources.

Required behaviour:

1. Receive or retrieve the selected Monitoring Objective.
2. Display:
   - objective name
   - business question
   - related risk factors
   - related risk definitions
3. Show suggested sources grouped into:
   - Internal Sources
   - External Sources
   - Historical Sources
4. Allow the user to select one or several sources.
5. Clearly show whether a source is:
   - real/public
   - internal/customer-provided
   - simulated PoC source
6. Include:
   - Add Custom Source
   - Back
   - Continue to Source Details
7. Do not execute connectors yet.
8. Do not implement dashboards.
9. Do not modify the backend.

Use the existing backend endpoint:

GET /api/monitoring-capabilities/:id

Centralize all API calls in frontend/src/services/api.js.

Create the page and feature components using the existing scalable structure.

Suggested route:

/configure/objectives/:objectiveId/sources

After implementation:

- run npm run build
- fix all errors
- show the final changed-file summary
- do not commit or push
```

---

## 5. Implement Information Source Details and AI Analysis

```text
Implement the Information Source Details and AI Connector Analysis workflow inside the existing frontend application.

Do not create a new app or backend.

Existing backend endpoints:

POST /api/information-sources
GET /api/information-sources
GET /api/information-sources/:id
POST /api/information-sources/:id/analyse

GET /api/connector-definitions
GET /api/connector-definitions/:id
PATCH /api/connector-definitions/:id

Workflow:

1. User selects or adds an Information Source.
2. Show a form containing:
   - name
   - provider
   - source kind
   - description
   - documentation/specification
   - sample JSON or other sample data
   - tags
   - related risk factors
3. Save the Information Source.
4. Provide an “Analyse with AI” action.
5. Display structured Connector Analysis in separate sections:
   - Technical Analysis
   - Business and Semantic Analysis
   - Data Quality
   - Assumptions and Missing Information
   - Confidence
6. Make it clear that the result is an AI-generated draft requiring review.
7. Allow editing before later approval.
8. Preserve traceability to the selected Monitoring Objective and Information Source.
9. Do not execute the connector yet.
10. Do not implement dashboards in this task.

The UI must visibly distinguish:

- information source
- risk factor
- enterprise risk
- connector configuration

Use the existing visual design and centralized API service.

After implementation:

- run npm run build
- fix all errors
- summarize changed files
- do not commit or push
```

---

## 6. Implement Risk Intelligence Dashboard

Use this prompt for the partner developing the dashboard:

```text
You are working inside the existing React and Vite application in frontend/.

Do not create another Vite project, package.json, backend or repository.

Preserve the existing Risk Digital Twin design system, header, navigation, logo and API architecture.

Implement the Risk Intelligence Dashboard as a new page and feature in the same application.

Suggested route:

/intelligence

The dashboard is a different use case from Monitoring Objective configuration.

Monitoring Objective configuration answers:
“What should the platform collect and understand?”

Dashboard configuration answers:
“How should the resulting risk intelligence be presented and managed?”

Dashboard requirements:

1. Support filtering by:
   - Enterprise Risk Category
   - Risk Subcategory
   - Risk Definition
   - Monitoring Objective
   - project
   - supplier
   - entity
   - geography
   - time
2. Show a coherent enterprise risk picture, not a random grid of charts.
3. Include:
   - risk situation summary
   - risk heatmap or priority view
   - trend over time
   - selected risk list
   - relationship view
   - evidence and source traceability
   - monitoring status
4. Allow drill-down from risk to:
   - affected entities
   - observations
   - incidents
   - evidence
   - original source records
5. Include risk-management actions:
   - assign owner
   - change probability
   - change impact
   - add mitigation
   - add note
   - update status
   - close risk
6. Allow saved/custom dashboard views later.
7. Use realistic seed data if backend endpoints are not yet available, but isolate mock data in a service layer so it can be replaced.
8. Clearly label mock/demo data.
9. Keep components modular and reusable.
10. Do not modify backend/ unless explicitly requested.

The dashboard must look like a premium industrial intelligence product with strong visual hierarchy and explainable AI, not merely a collection of widgets.

After implementation:

- run npm run build
- fix all errors
- show the final file tree for the dashboard feature
- summarize mock data assumptions
- do not commit or push
```

---

## 7. Refactor Existing Frontend Structure

```text
You are working inside the existing React/Vite project.

The application already works. Reorganize the frontend source code into a scalable multi-page structure without changing visual design, behaviour, API calls or business logic.

Rules:

- Do not create a new project.
- Do not create another package.json.
- Do not run npm init.
- Do not recreate vite.config.js.
- Do not create a backend.
- Preserve all working functionality.
- Use plain JavaScript.

Target src structure:

src/
├── components/
│   ├── layout/
│   ├── shared/
│   └── monitoring-objectives/
├── hooks/
├── lib/
├── pages/
│   └── MonitoringObjectivesPage.jsx
├── services/
│   └── api.js
├── styles/
├── App.jsx
├── index.css
└── main.jsx

Tasks:

1. Inspect existing src files.
2. Move page composition into pages/MonitoringObjectivesPage.jsx.
3. Keep App.jsx minimal.
4. Move header/navigation into components/layout/.
5. Move generic loading/error/empty states into components/shared/.
6. Move Monitoring Objective-specific components into components/monitoring-objectives/.
7. Centralize REST calls in services/api.js.
8. Update all imports.
9. Do not create placeholder pages.
10. Run npm run build and fix errors.
11. Show the final src tree.
12. Do not commit or push.
```

---

## 8. Git Workflow Prompt

Use only after the local work has been reviewed:

```text
You are working in the existing Risk-Digital-Twin Git repository.

Before committing:

1. Run git status.
2. Confirm that node_modules, dist and .env files are not staged.
3. Run npm run build inside frontend/.
4. Summarize all changed files.
5. Ask for confirmation before committing.

After confirmation:

1. Commit to the current feature branch with a clear message.
2. Push the current branch to origin.
3. Do not merge into main.
4. Do not force push.
5. Do not modify backend files unless they were explicitly part of the task.
```

---

## 9. Notes for Humans Using These Prompts

- Give Claude only the prompt relevant to the current task.
- Keep architecture and terminology in docs/Ontology.md.
- Use one frontend application with several pages.
- Review the UI visually after every major iteration.
- Ask Claude to run the production build before accepting work.
- Keep internal simulated sources clearly labelled.
- Keep external-source use compliant with licensing, access and API conditions.
- Do not allow Claude to push directly to main.
