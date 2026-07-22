# Sprint 01 -- Information Sources (AI Source Advisor)

## Goal

Implement the second page of the **Configure** workflow in the existing
**Risk Digital Twin** application.

The **Monitoring Objectives** page is already implemented.

Continue the existing workflow.

Do **not** redesign the Monitoring Objectives page.

------------------------------------------------------------------------

# Repository Rules

-   Work in the existing Git repository.
-   Do **not** create another React project.
-   Do **not** create another backend.
-   Do **not** recreate package.json.
-   Do **not** modify backend.
-   Do **not** commit.
-   Do **not** push.
-   Reuse the existing design system and shared components.

------------------------------------------------------------------------

# Backend API

POST `/api/monitoring-capabilities/:objectiveId/source-recommendations`

The response contains:

-   summary
-   coverageAssessment
-   recommendations
-   assumptions

Each recommendation already contains:

-   priority
-   recommendationType
-   shortReason
-   businessValue
-   availabilityStatus
-   availabilityLabel
-   actions
-   confidence

Always render the backend response dynamically.

------------------------------------------------------------------------

# UX Vision

Create a premium enterprise UI that feels like an AI assistant helping a
Risk Manager.

Avoid CRUD-style forms.

Design inspiration:

-   Microsoft Fabric
-   Azure Portal
-   Palantir Foundry

------------------------------------------------------------------------

# Layout

## Coverage Assessment

Display Information Needs with status chips:

-   Strong
-   Partial
-   Missing
-   Unknown

Present as a business dashboard.

------------------------------------------------------------------------

## AI Source Advisor

Display recommendations sorted by priority.

Each card contains:

-   Priority badge
-   Recommendation Type
-   Source Name
-   Provider
-   Availability
-   Short Reason
-   Business Value

Buttons:

-   Accept
-   Reject
-   Alternative

Expand card to show:

-   Business Value
-   Next Steps
-   Limitations

Do not show technical integration details.

------------------------------------------------------------------------

## Summary Panel

Sticky panel showing:

-   Monitoring Objective
-   Coverage summary
-   Accepted recommendations
-   Rejected recommendations

Continue disabled until one recommendation is accepted.

------------------------------------------------------------------------

# Components

Create:

-   CoverageSection
-   CoverageCard
-   RecommendationSection
-   RecommendationCard
-   SummaryPanel

Reuse shared components.

------------------------------------------------------------------------

# Validation

Run:

-   npm run dev
-   npm run build

Fix all errors.

Return:

-   Changed files
-   Component tree
-   Design summary

Do not commit or push.
