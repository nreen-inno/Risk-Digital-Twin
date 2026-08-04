
# Risk Digital Twin – Connector Component Architecture (Reference)

## Purpose

This document defines the component architecture for the Connector Platform of the Risk Digital Twin (RDT). It aligns onboarding, connector execution and downstream AI processing.

## End-to-End Architecture

```
Monitoring Objective
        ↓
Information Source
        ↓
Connector Proposal
        ↓
Connector Specification
        ↓
Connector Definition
        ↓
Connector Runtime
        ↓
RawRecord
        ↓
Monitoring Profile Pre-filter
        ↓
AI Enrichment
        ↓
Risk Signal Engine
        ↓
Dashboard / Alerts
```

## High-Level Components

### Frontend
- Source Workspace
- Connector Proposal Review
- Connector Specification Editor
- Connector Test View
- Connector Runtime Health
- Raw Record Explorer
- Risk Signal & Evidence View

### Backend
- Information Source Service
- Connector Recommendation Service
- Connector Proposal Service
- Connector Specification Service
- Connector Definition Service
- Connector Test Service
- Connector Runtime
- Connector Adapter Framework
- Raw Record Service
- Monitoring Profile Service
- Pre-filter Service
- AI Enrichment Service
- Risk Signal Engine
- Dashboard Query Service

## Storage

### Cosmos DB
Configuration:
- InformationSource
- ConnectorProposal
- ConnectorSpecification
- ConnectorDefinition
- MonitoringProfile
- MonitoringObjective

Operations:
- ConnectorTestResult
- ConnectorExecution
- ConnectorErrors

Runtime:
- RawRecord
- AIEnrichment
- RiskSignal

### Azure Blob Storage
- Raw payloads
- Attachments
- Connector test artefacts

## Connector Adapter Framework

Initial adapters:

- RSS/Atom Pull
- REST API Pull
- File Import

Future:

- Webhook
- Database
- Message Queue

Common interface:

```javascript
validateConfiguration()
testConnection()
fetch()
parse()
mapToRawRecords()
```

## Frontend Modules

- ConnectorProposalView
- ConnectorSpecificationEditor
- ConnectorTestPanel
- ConnectorHealthPanel
- RawRecordTable
- RawRecordDetails
- RiskSignalDetails

## Backend Folder Structure

```
controllers/
services/
connectors/
repositories/
schemas/
routes/
workers/
```

## Runtime Pipeline

```
Scheduler
    ↓
Connector Runtime
    ↓
Adapter
    ↓
RawRecord
    ↓
Pre-filter
    ↓
AI Enrichment
    ↓
Risk Signal
    ↓
Dashboard
```

## MVP Roadmap

### Phase 1
- Proposal
- Specification
- Definition
- RSS Adapter
- Test Service
- RawRecord Service

### Phase 2
- Scheduler
- Runtime
- Execution History
- Connector Health

### Phase 3
- Monitoring Profiles
- Pre-filter
- AI Enrichment
- Risk Signals
- Evidence View

## Architectural Principles

1. Connector collects data only.
2. Monitoring Profiles determine relevance.
3. AI performs semantic enrichment.
4. Risk Signal Engine performs business interpretation.
5. Every Risk Signal is traceable to the original evidence.

---

# Prompt for Cursor / Claude

Implement the connector platform according to this architecture.

Requirements:

- Preserve the separation between Proposal, Specification, Definition, Test Result and Runtime.
- Do not place business logic inside connector adapters.
- Connector adapters only collect data and map to RawRecords.
- Use Monitoring Profiles for filtering.
- AI Enrichment creates semantic metadata.
- Risk Signal Engine creates business risks.
- Design reusable adapters (RSS, REST, File Import).
- Store configuration separately from runtime data.
- Make all services modular and independently testable.
- Use the architecture above as the reference implementation.
- Prefer incremental implementation beginning with an RSS connector (YLE) and keep the design extensible for future connector types.
