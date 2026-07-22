# Risk Digital Twin Ontology and Implementation Architecture

**Version:** 2.1  
**Status:** Demo architecture baseline  
**Primary use case:** Meyer Risk Digital Twin demo  
**Demo target:** 13 August 2026

## 1. Vision

The Risk Digital Twin is an AI-assisted enterprise risk intelligence platform that transforms heterogeneous internal and external information into a unified, traceable and continuously updated enterprise risk picture.

Unlike a traditional risk register, the platform does not begin with manually entered risks only. It begins with a business monitoring need, identifies relevant risk factors and information sources, builds or configures connectors with AI assistance, preserves the original incoming data, and maps evidence into a common enterprise risk ontology.

The same technical foundation can later support other domain applications such as Quality, Sustainability, Supply Chain, Commissioning and Maintenance Digital Twins. For the current customer-facing demo, the product name remains **Risk Digital Twin**.

---

## 2. Main Principles

1. Business concepts are separated from technical integration.
2. Monitoring Objectives are the user-facing entry point.
3. Enterprise Risk Categories remain the formal governance and reporting structure.
4. Monitoring Objectives are not the same as Enterprise Risk Categories.
5. One Monitoring Objective may relate to several risk factors, risk definitions and enterprise risk categories.
6. One information source may support several monitoring objectives and risk factors.
7. One risk factor may influence several risk definitions and categories.
8. AI assists source analysis, connector creation and semantic mapping, but users can review, modify and approve suggestions.
9. Original incoming information is preserved as an immutable Raw Record.
10. Every interpreted risk, observation or recommendation must remain traceable to its evidence and source.
11. Stable connector execution should be deterministic after AI-assisted configuration is approved.
12. The demo should implement only features that support the end-to-end customer story.

---

## 3. User-Facing Business Flow

```text
What would you like to monitor?
        ↓
Select Monitoring Objective
        ↓
Review related Risk Factors and Enterprise Risks
        ↓
Select or add Internal / External / Historical Information Sources
        ↓
AI analyses source documentation or samples
        ↓
AI proposes Connector Analysis and Connector Definition
        ↓
User reviews and approves
        ↓
Connector Instance is configured
        ↓
Connector Runtime ingests Raw Records
        ↓
AI interprets records and proposes Knowledge Objects
        ↓
Risk Intelligence is updated
        ↓
Dashboard, alerts and risk-management actions
```

This objective-first workflow is used because business users naturally think in questions such as:

- Are suppliers becoming a project risk?
- Could weather affect logistics or sea trials?
- Which political or regulatory developments could affect shipbuilding projects?
- Are commodity and energy prices creating cost pressure?

The underlying enterprise taxonomy is still used for governance, analysis, filtering and reporting.

---

## 4. Core Semantic Relationships

```text
Monitoring Objective
    ├── monitors → Risk Factors
    ├── relates to → Risk Definitions
    ├── affects → Enterprise Risk Categories
    └── uses → Information Sources

Risk Factor
    ├── influences → Risk Definitions
    └── is evidenced by → Observations / Incidents / Evidence

Risk Definition
    └── belongs to → Risk Subcategory → Enterprise Risk Category

Information Source
    └── accessed through → Connector Definition → Connector Instance

Connector Instance
    └── produces → Raw Records

Raw Record
    └── interpreted into → Knowledge Objects

Knowledge Objects
    └── support → Risk Instances, dashboards and recommendations
```

All major relationships are many-to-many unless explicitly restricted.

---

## 5. Core Objects

| Object | Purpose | Created by | Demo priority |
|---|---|---|---|
| **EnterpriseRiskCategory** | Top-level formal enterprise risk taxonomy, for example Strategic, Financial, Supply Chain, Project, Engineering, HSE, Cybersecurity and Regulatory. | Administrator or imported taxonomy | Essential |
| **RiskSubcategory** | More specific classification within an Enterprise Risk Category. | Administrator or imported taxonomy | Essential |
| **RiskDefinition** | Reusable recognised risk such as Late Delivery, Supplier Insolvency, Sea Trial Delay or Regulatory Compliance Failure. | Administrator, expert or imported taxonomy | Essential |
| **RiskFactor** | Internal or external condition that may influence one or more risks, such as severe weather, sanctions, supplier capacity or commodity-price volatility. | Administrator, expert or AI suggestion | Essential |
| **MonitoringObjective** | User-facing business goal describing what the organisation wants to monitor. | User, administrator or later AI-assisted custom creation | Essential |
| **InformationSource** | Provider, system, service, file collection or person delivering information, for example ERP, FMI, EU news, historical incident file or manual expert. | User or administrator | Essential |
| **ConnectorDefinition** | Reusable description of how a source can be accessed, ingested, parsed, validated and semantically mapped. | AI Connector Builder plus user review | Essential |
| **ConnectorInstance** | Configured executable use of a Connector Definition for a specific endpoint, environment, project, geography or dataset. | User | Essential |
| **ConnectorRun** | Audit record of one connector execution, including timing, status, processed records and errors. | Connector Runtime | Useful |
| **RawRecord** | Immutable original source information received from an API, feed, database, file, document or manual input. | Connector Runtime or ingestion API | Essential |
| **ConnectorAnalysis** | Structured AI analysis containing technical analysis, business analysis, data-quality findings, assumptions and confidence. | AI Connector Builder | Essential |
| **Interpretation** | AI explanation of what one or more Raw Records mean in the business context. | AI Semantic Mapper | Essential |
| **MappingSuggestion** | AI proposal for creating or linking ontology objects from interpreted source data. | AI Semantic Mapper | Essential |
| **KnowledgeObject** | Common parent structure for semantically interpreted objects. | System, AI or user | Essential |
| **Entity** | Relevant object such as supplier, ship, project, material, port, country, regulation, work package or system. | AI, import process or user | Essential |
| **Observation** | Current measured, reported or detected fact such as a delivery delay, price increase, weather warning or supplier status change. | Connector, AI or user | Essential |
| **Incident** | Historical or current event that caused or could have caused an impact. | Import process, AI or user | Essential |
| **Evidence** | Traceable information supporting an interpretation, incident, observation or risk assessment. | System, AI or user | Essential |
| **RiskInstance** | Specific current risk affecting one or more entities, projects, suppliers or processes. | User or AI suggestion approved by user | Essential |
| **Relationship** | First-class semantic link between ontology objects, for example SUPPLIES, AFFECTS, PART_OF, CAUSED_BY or SUPPORTS. | AI, connector mapping or user | Essential |
| **Mitigation** | Action intended to reduce probability, impact, exposure or duration of a Risk Instance. | User or later AI recommendation | Useful |
| **Recommendation** | Suggested action or interpretation based on risks, evidence, observations and incidents. | AI or expert | Later |
| **Scenario** | What-if configuration combining risks, assumptions, entities and changed values. | User | Later |

---

## 6. Monitoring Objectives for the Demo

### 6.1 Geopolitical & Regulatory Monitoring

**Business question:**  
Which political, regulatory or trade developments could affect suppliers, logistics and shipbuilding projects?

**Typical risk factors:**

- geopolitical instability
- political conflict
- sanctions
- trade restrictions
- export controls
- regulatory change

**Typical risk definitions:**

- customs and trade disruption
- late delivery
- supplier instability
- regulatory compliance failure
- engineering change

**Example sources:**

- European Commission news and updates
- IMO regulatory updates
- government and customs authority bulletins
- selected public or licensed news feeds

### 6.2 Supplier Stability

**Business question:**  
Are any suppliers becoming a risk to project cost, quality or schedule?

**Typical risk factors:**

- supplier capacity
- supplier financial pressure
- material availability
- transport disruption
- delivery performance
- supplier quality

**Typical risk definitions:**

- supplier insolvency
- late delivery
- material shortage
- supplier quality deviation
- project schedule delay

**Example sources:**

- internal ERP or procurement system
- supplier portal
- supplier delivery CSV or Excel export
- historical supplier incidents
- manual expert assessment

### 6.3 Weather & Natural Hazards

**Business question:**  
Could weather or natural hazards disrupt logistics, production, commissioning or sea trials?

**Typical risk factors:**

- severe weather
- high wind
- storms
- flooding
- sea state
- transport disruption

**Typical risk definitions:**

- sea trial delay
- transport delay
- production interruption
- outdoor work interruption
- business continuity disruption

**Example sources:**

- Finnish Meteorological Institute
- OpenWeather
- ECMWF
- other weather or marine forecast services

### 6.4 Commodity & Energy Prices

**Business question:**  
Are changes in material or energy prices increasing procurement and project cost risks?

**Typical risk factors:**

- commodity-price volatility
- energy-price volatility
- inflation
- procurement cost
- supplier financial pressure

**Typical risk definitions:**

- budget overrun
- procurement cost increase
- supplier instability
- material substitution
- project profitability decline

**Example sources:**

- MEPS steel price information
- London Metal Exchange or another commodity-market service
- internal procurement price history
- selected financial-market APIs

### 6.5 Custom Monitoring Objective

The platform should later allow the user to define a custom business question. AI may then suggest:

- relevant enterprise risk categories
- risk definitions
- risk factors
- candidate information sources
- connector configurations

For the first demo, this is represented in the UI as a planned next step rather than a complete workflow.

---

## 7. Information Sources

Information Sources provide evidence. A topic such as weather, politics or commodity prices is not itself a source.

Examples:

| Monitoring subject | Possible Information Sources |
|---|---|
| Weather | FMI, OpenWeather, ECMWF, NOAA |
| Commodity prices | MEPS, LME, financial-market APIs, procurement history |
| Geopolitical and regulatory developments | European Commission, IMO, government bulletins, public or licensed news feeds |
| Supplier stability | ERP, procurement system, supplier portal, historical incidents, manual expert input |

One Monitoring Objective may use several internal, external and historical sources. One Information Source may support several objectives and risk factors.

### Demo data policy

- **Internal enterprise sources:** use realistic simulations or representative exports until Meyer provides access to actual interfaces.
- **External public sources:** use real feeds or APIs where technically and legally practical.
- **Historical sources:** use representative CSV/Excel datasets initially, later replaced with customer data.

The UI and backend must clearly label simulated sources as simulated PoC data.

---

## 8. AI-Assisted Connector Creation

The user provides one or more of:

- API documentation
- OpenAPI or Swagger specification
- sample JSON or XML
- CSV or Excel sample
- database schema
- RSS feed
- PDF or technical documentation
- manually entered source description

The AI Connector Builder performs two logically separate analyses while keeping one simple user workflow.

### 8.1 Technical Analysis

AI suggests:

- transport
- input format
- authentication type
- polling, webhook, listening, streaming, file import, database query or manual ingestion
- recommended frequency
- incremental-loading strategy
- record identifiers and deduplication
- pagination
- parsing rules
- technical field mapping
- validation rules
- assumptions and missing technical information

### 8.2 Business and Semantic Analysis

AI suggests:

- supported Monitoring Objectives
- relevant Risk Factors
- relevant Risk Definitions
- affected Enterprise Risk Categories
- likely Entity types
- likely Knowledge Object types
- semantic field mappings
- confidence and explanation

The generated result is stored as a structured **ConnectorAnalysis** and a draft **ConnectorDefinition**. The user can review and modify the proposal before approval.

### 8.3 Runtime Principle

AI assists in building and validating connector configuration. After approval, routine connector execution should use deterministic configuration rather than asking AI to rediscover the source on every run.

---

## 9. Connector Definition

A Connector Definition contains reusable technical and semantic defaults such as:

- Information Source reference
- transport
- parser and input format
- authentication type
- ingestion strategy
- default schedule
- incremental-loading logic
- pagination
- deduplication
- field transformations
- technical mapping
- semantic mapping
- validation rules
- supported ontology object types
- confidence
- assumptions
- review status

One Information Source may have several Connector Definitions, for example REST API, RSS, database view and file export.

---

## 10. Connector Instance

A Connector Instance is the configured executable deployment of a Connector Definition.

Examples:

- Meyer SAP test purchase orders
- Meyer SAP production deliveries
- Turku severe-weather monitor
- EU regulatory RSS feed
- historical supplier incidents import

Instance-specific fields include:

- endpoint or file location
- environment
- credentials reference
- schedule
- geographic or project filters
- activation status
- last successful run
- next planned run

Credentials must not be stored directly in source code or committed to Git.

---

## 11. Raw Record and Ingestion

A Raw Record is immutable digital evidence. It preserves exactly what was received.

The existing backend supports:

```text
POST /api/ingestion/raw
GET  /api/ingestion/raw
```

Current Raw Records include:

- source identifier
- received timestamp
- content type
- processing status
- original payload
- metadata
- created and updated timestamps

Later, Raw Records should also reference:

- Information Source
- Connector Definition
- Connector Instance
- Connector Run

---

## 12. AI Interpretation and Mapping

After ingestion:

```text
Raw Record
    ↓
AI Interpretation
    ↓
Mapping Suggestion
    ↓
User review or acceptance rule
    ↓
Knowledge Objects
```

AI may identify:

- entities
- observations
- incidents
- evidence
- possible risk factors
- possible risk definitions
- confidence
- explanation

Incoming data should not automatically become a Risk Instance. Most records first become Observation, Incident, Evidence or Entity objects. Risk Instances are created or updated only when justified by evidence and configured rules.

---

## 13. Knowledge Objects

All semantic objects share common properties:

- id
- objectType
- source references
- confidence
- status
- createdAt
- updatedAt
- relationships

Examples include:

- Entity
- Observation
- Incident
- Evidence
- RiskInstance
- Relationship

Relationships are first-class objects and may include:

- SUPPLIES
- AFFECTS
- REQUIRED_BY
- PART_OF
- LOCATED_IN
- CAUSED_BY
- SUPPORTS
- EVIDENCE_FOR

---

## 14. Current Implementation

### 14.1 Azure and Backend

Implemented:

- Azure resource group for the demo
- Azure Cosmos DB for NoSQL
- database `meyer-risk`
- container `objects`
- partition key `/objectType`
- Node.js 20 / Express backend
- database health endpoint
- raw-record creation and retrieval
- Information Source endpoints
- Connector Definition endpoints
- Monitoring Objective catalogue endpoint
- Azure AI Foundry resource and GPT-5.2 deployment
- AI connectivity test
- structured AI Connector Analysis
- rule-based fallback if AI analysis is unavailable

Current main endpoints include:

```text
GET  /api/health
GET  /api/health/database

POST /api/ingestion/raw
GET  /api/ingestion/raw

POST /api/information-sources
GET  /api/information-sources
GET  /api/information-sources/:id
POST /api/information-sources/:id/analyse

GET   /api/connector-definitions
GET   /api/connector-definitions/:id
PATCH /api/connector-definitions/:id

GET /api/monitoring-capabilities
GET /api/monitoring-capabilities/:id

GET /api/ai/test
```

The API currently retains the internal endpoint name `monitoring-capabilities`, while the UI uses the customer-facing term **Monitoring Objectives**.

### 14.2 Frontend

Implemented:

- React + Vite frontend in plain JavaScript
- premium enterprise landing experience
- four Monitoring Objective cards
- loading, error, retry and empty states
- selected-objective state
- custom-objective placeholder
- selected-objective summary panel
- REST connection to the backend
- scalable source structure with pages, components, services, hooks, library and styles

The frontend and backend are maintained as separate npm applications inside one repository.

---

## 15. Repository Architecture

```text
Risk-Digital-Twin/
├── backend/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── index.html
├── docs/
│   ├── Ontology.md
│   ├── ClaudePrompts.md
│   ├── Architecture.md
│   ├── API.md
│   ├── DemoScenario.md
│   └── DecisionLog.md
├── .gitignore
└── README.md
```

There is one frontend application with multiple pages, not one frontend app per use case.

Planned frontend routes:

```text
/configure/objectives
/configure/objectives/:objectiveId/sources
/configure/sources/:sourceId/analysis
/intelligence
/intelligence/risks/:riskId
```

---

## 16. Demo Scope

The planned demo should show two connected use cases.

### Use Case 1: Configure Monitoring

1. Select a Monitoring Objective.
2. View related risk factors and enterprise risks.
3. Review suggested internal, external and historical sources.
4. Select or add an Information Source.
5. Provide documentation or sample data.
6. Ask AI to analyse the source.
7. Review technical analysis, business analysis, data-quality findings and confidence.
8. Save or approve the draft connector configuration.

### Use Case 2: Risk Intelligence Dashboard

The dashboard should allow users to:

- choose enterprise risk categories and risk definitions
- filter by project, supplier, geography, entity and time
- view relationships among factors, sources, entities, observations and risks
- inspect evidence and source traceability
- assign owners
- change probability and impact
- add mitigation
- add notes
- close or update risks
- configure and save dashboard views

Dashboard customisation is different from Monitoring Objective configuration:

```text
Monitoring Objective configuration
= What should the platform collect and understand?

Dashboard configuration
= How should risk intelligence be presented and managed?
```

---

## 17. Next Implementation Priorities

1. Implement the Information Sources selection page.
2. Link selected Monitoring Objective to suggested Information Sources.
3. Support real external RSS/API sources and clearly marked simulated internal sources.
4. Connect the source form to existing Information Source and AI analysis endpoints.
5. Display structured Connector Analysis in the frontend.
6. Add Connector Instance configuration and test execution.
7. Extend Raw Records with source and connector references.
8. Implement semantic interpretation and Mapping Suggestions.
9. Seed demo risk taxonomy, entities, observations, incidents and risks.
10. Integrate the main Risk Intelligence Dashboard into the same frontend application.
11. Prepare a stable scripted demo with fallback data for unreliable external services.

---

## 18. Architecture Freeze for the Demo

The following structure is considered stable for the demo:

```text
Monitoring Objective
        ↓
Risk Factors and Enterprise Risk Taxonomy
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
AI Interpretation and Mapping Suggestions
        ↓
Knowledge Objects
        ↓
Risk Intelligence
        ↓
Dashboards and Risk-Management Actions
```

Further work should refine attributes, mappings, sources and UI behaviour rather than redesigning the central architecture.
