# Risk Digital Twin -- Architecture Decision Log

This document records major architectural and product decisions.

------------------------------------------------------------------------

## ADR-001 --- Monorepo Structure

**Date:** 2026-07-22

### Decision

Use a single Git repository (monorepo) containing separate backend and
frontend applications.

### Structure

``` text
Risk-Digital-Twin/
├── backend/
├── frontend/
└── docs/
```

### Reason

Backend and frontend evolve together but remain independent applications
with separate dependencies. This simplifies collaboration, deployment
and future expansion.

**Status:** Accepted

------------------------------------------------------------------------

## ADR-002 --- Single Frontend Application

### Decision

Use one React frontend application with multiple pages instead of
multiple frontend applications.

### Reason

All use cases belong to one product and should share navigation,
authentication, API services, design system and deployment.

### Planned pages

-   Monitoring Objectives
-   Information Sources
-   Connector Analysis
-   Risk Intelligence Dashboard

**Status:** Accepted

------------------------------------------------------------------------

## ADR-003 --- Monitoring Objectives First

### Decision

Monitoring Objectives are the primary business entry point.

### Reason

Business users think in terms of *what they want to monitor*, not formal
enterprise risk taxonomy.

Enterprise Risk Categories remain the underlying governance and
reporting model.

**Status:** Accepted

------------------------------------------------------------------------

## ADR-004 --- Risk Factors vs Information Sources

### Decision

Weather, politics, commodity prices and supplier stability are **Risk
Factors**, not **Information Sources**.

### Reason

Risk Factors describe conditions that influence enterprise risks.

Information Sources are concrete providers of evidence such as:

-   ERP
-   FMI
-   RSS feeds
-   Historical databases
-   Supplier portals
-   Government portals

**Status:** Accepted

------------------------------------------------------------------------

## ADR-005 --- AI Usage

### Decision

AI is used for:

-   connector discovery
-   connector analysis
-   semantic mapping
-   interpretation

Routine connector execution should remain deterministic after approval.

### Reason

Ensures repeatability, explainability and predictable operation.

**Status:** Accepted

------------------------------------------------------------------------

## ADR-006 --- Immutable Raw Records

### Decision

Every incoming record is stored as an immutable Raw Record.

### Reason

Maintains traceability and allows future reinterpretation without losing
original evidence.

**Status:** Accepted

------------------------------------------------------------------------

## ADR-007 --- Separate Technical and Business Analysis

### Decision

AI Connector Analysis consists of two independent sections.

### Technical Analysis

-   authentication
-   transport
-   parser
-   polling/listening/import
-   scheduling
-   technical mapping

### Business Analysis

-   Monitoring Objectives
-   Risk Factors
-   Risk Definitions
-   Enterprise Risk Categories
-   semantic mapping
-   confidence

### Reason

Technical integration and business semantics evolve independently.

**Status:** Accepted

------------------------------------------------------------------------

## ADR-008 --- Demo Scope

### Decision

The first demo demonstrates two integrated use cases.

1.  Configure Monitoring
2.  Risk Intelligence Dashboard

### Reason

Demonstrates the complete journey from defining a business monitoring
objective to enterprise risk intelligence.

**Status:** Accepted

------------------------------------------------------------------------

## ADR-009 --- Repository Documentation

### Decision

All architecture and product documentation is stored under:

``` text
docs/
```

including:

-   Ontology.md
-   Architecture.md
-   API.md
-   ClaudePrompts.md
-   DemoScenario.md
-   DecisionLog.md

### Reason

Keeps technical knowledge version-controlled with the codebase.

**Status:** Accepted

------------------------------------------------------------------------

## ADR-010 --- Architecture Freeze for Demo

### Decision

Freeze the core architecture before feature expansion.

Core workflow:

``` text
Monitoring Objective
        ↓
Information Sources
        ↓
AI Connector Analysis
        ↓
Connector Definition
        ↓
Connector Instance
        ↓
Raw Records
        ↓
AI Interpretation
        ↓
Knowledge Objects
        ↓
Risk Intelligence Dashboard
```

### Reason

Avoid redesign during demo implementation and focus on feature
completion and polish.

**Status:** Accepted
