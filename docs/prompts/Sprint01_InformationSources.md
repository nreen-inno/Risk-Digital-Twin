# Sprint 01 -- Information Sources Selection

## Goal

Implement the second page of the Configure workflow in the existing Risk
Digital Twin application.

The Monitoring Objectives page already exists. Continue the existing
user journey. Do not redesign it.

## Repository Rules

-   Existing Git repository only.
-   Do not create another repository, frontend, backend or package.json.
-   Work only inside `frontend/`.
-   Do not modify backend unless requested.
-   Use plain JavaScript.
-   Preserve the existing design system.
-   Do not commit or push.

## Business Context

Monitoring Objectives answer: **What does the organisation want to
monitor?**

Information Sources are concrete providers of evidence.

Examples: - ERP - Supplier Portal - FMI - RSS - Historical CSV -
Government Portal

Weather, politics, sanctions and commodity prices are Risk Factors, not
Information Sources.

## Backend

Use:

GET /api/monitoring-capabilities/:id

Use the existing API service and VITE_API_BASE_URL.

## Routes

/configure/objectives

/configure/objectives/:objectiveId/sources

Continue from the Monitoring Objectives page.

## Build

Create:

`src/pages/InformationSourcesPage.jsx`

Create feature components under:

`src/components/information-sources/`

Display:

-   objective name
-   business question
-   description
-   related Risk Factors
-   related Risk Definitions

Group sources into:

-   Internal
-   External
-   Historical

Each card shows:

-   name
-   description
-   source kind
-   source role
-   suggested use
-   supported inputs
-   access type
-   demo data mode

Allow multi-selection.

Store selected IDs in React state and sessionStorage.

Do not save to backend yet.

Summary panel:

-   selected objective
-   selected source count
-   internal/external/historical counts

Buttons:

-   Back
-   Continue

Disable Continue until at least one source is selected.

Include:

-   Add Custom Information Source

Show placeholder only.

## UI

Professional enterprise AI platform.

Reference: - Microsoft Fabric - Azure Portal - Palantir Foundry

Avoid CRUD forms.

## Validation

Run:

-   npm run dev
-   npm run build

Fix all errors.

Provide: - changed files - src tree - new dependencies

Do not commit or push.
