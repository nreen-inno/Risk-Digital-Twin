# Risk Digital Twin Ontology

## Purpose

The Risk Digital Twin integrates internal systems, historical incidents, manually created risks, and external information sources into a common semantic model.

New data sources are connected through AI-assisted connector definitions. The connector builder analyses source documentation, API specifications, sample files, or sample records and suggests:

- how to access the source;
- how often to ingest data;
- how to parse and standardise records;
- how source fields map to the common data model;
- which risk categories, entities, incidents, or observations may be relevant.

AI-generated suggestions must be reviewable and configurable by the user.

## Core objects

| Object | Purpose | Created by | Key relationships | Demo priority |
|---|---|---|---|---|
| **DataSource** | Describes the system, organisation, service, file collection, or person from which information originates. Examples: ERP, weather service, news API, incident database, manual expert input. | User or administrator | Has many ConnectorDefinitions; produces RawRecords through ConnectorInstances | Essential |
| **ConnectorDefinition** | Reusable description of how a source can be accessed, parsed, ingested, and mapped. Includes default ingestion strategy, authentication type, parser, mappings, and transformations. | AI Connector Builder, reviewed by user | Belongs to DataSource; used by many ConnectorInstances | Essential |
| **ConnectorInstance** | Configured and executable use of a ConnectorDefinition for a specific environment, endpoint, project, region, or dataset. | User, based on ConnectorDefinition | Uses ConnectorDefinition; produces RawRecords | Essential |
| **ConnectorRun** | Records one execution of a ConnectorInstance, including start time, end time, status, number of processed records, and errors. | Connector Runtime | Belongs to ConnectorInstance; creates RawRecords | Useful |
| **RawRecord** | Preserves the original source information without changing its meaning. It is the traceable source evidence received from an API, file, ERP, document, feed, or manual submission. | Connector Runtime or ingestion API | Comes from ConnectorInstance; interpreted into KnowledgeObjects | Essential |
| **MappingSuggestion** | AI-generated proposal describing how a RawRecord should be interpreted and mapped to ontology objects. Includes suggested object type, entities, category, confidence, and explanation. | AI Semantic Mapper | Refers to RawRecord; may create or update KnowledgeObjects | Essential |
| **KnowledgeObject** | Common base concept for semantically interpreted information. Provides shared fields such as ID, object type, source, confidence, timestamps, status, and relationships. | System, AI, or user | Base structure for Observation, Incident, RiskInstance, Entity, and Evidence | Essential |
| **Entity** | Represents something relevant to risk analysis. Examples: supplier, ship project, ship, customer, material, work package, department, country, port, transport route, regulation, or system. | User, import process, or AI | Connected to other Entities; affected by Risks and Incidents; supported by Observations | Essential |
| **Relationship** | Describes a semantic connection between objects. Examples: SUPPLIES, AFFECTS, REQUIRED_BY, PART_OF, LOCATED_IN, CAUSED_BY, EVIDENCE_FOR. | User, connector mapping, or AI | Connects two ontology objects | Essential |
| **Observation** | A measured, reported, or detected fact that may influence risk assessment. Examples: price increase, delivery delay, storm warning, supplier status change, regulation publication. | Connector, AI, or user | Based on RawRecord; concerns Entities; supports RiskInstances | Essential |
| **Incident** | An event that has already happened and produced or could have produced an impact. Historical incidents are used for learning, comparison, and risk estimation. | Import, user, or AI | Affects Entities; linked to RiskDefinitions; supported by Evidence | Essential |
| **RiskCategory** | Top-level enterprise risk classification. Examples: Strategic, Financial, Supply Chain, Project, Engineering, HSE, Cybersecurity, Regulatory. | Administrator or imported taxonomy | Contains RiskSubcategories | Essential |
| **RiskSubcategory** | More specific classification within a RiskCategory. Examples: Logistics, Supplier Stability, Budget and Cost, Sea Trials, OT Security. | Administrator or imported taxonomy | Belongs to RiskCategory; contains RiskDefinitions | Essential |
| **RiskDefinition** | Reusable description of a recognised type of uncertainty. Examples: Late Delivery, Supplier Insolvency, Commodity Price Increase, Sea Trial Delay. | Administrator, expert, or imported taxonomy | Belongs to RiskSubcategory; used by RiskInstances and Incidents | Essential |
| **RiskInstance** | A specific current risk affecting one or more entities, projects, suppliers, or processes. Includes probability, impact, trend, status, owner, evidence, and mitigation. | User or AI suggestion approved by user | Uses RiskDefinition; affects Entities; supported by Observations, Incidents, and Evidence | Essential |
| **Evidence** | Information that supports an interpretation, assessment, or decision. It may refer to a RawRecord, document, observation, incident, or manual note. | System, AI, or user | Supports RiskInstance, Incident, or MappingSuggestion | Useful |
| **Mitigation** | Action intended to reduce probability, impact, exposure, or duration of a RiskInstance. | User or AI recommendation | Belongs to RiskInstance | Useful |
| **Scenario** | A configurable what-if situation combining risks, assumptions, entities, and changed values. | User | Includes RiskInstances and affected Entities | Later |
| **Recommendation** | Suggested action or interpretation generated from risks, evidence, incidents, and observations. | AI or expert | Refers to RiskInstances, Entities, or Scenarios | Later |

## Core processing flow

```text
Data Source
    ↓
AI Connector Builder
    ↓
Connector Definition
    ↓
Connector Instance
    ↓
Connector Runtime
    ↓
Raw Record
    ↓
AI Semantic Mapper
    ↓
Mapping Suggestion
    ↓
User review or automatic acceptance rule
    ↓
Observation / Incident / Entity / Evidence / Risk Instance
    ↓
Risk analysis, dashboard, alerts, and scenarios


And add this section for the connector logic:

```markdown
## AI-assisted connector creation

For a new source, the user provides one or more of the following:

- API documentation;
- OpenAPI or Swagger specification;
- sample JSON or XML;
- CSV or Excel file;
- database schema;
- RSS feed;
- document or technical specification;
- manually entered description.

The AI Connector Builder proposes:

| Area | Suggested configuration |
|---|---|
| Transport | HTTP, file, database, message queue, RSS, manual |
| Input format | JSON, XML, CSV, Excel, text, PDF |
| Authentication | API key, OAuth, basic authentication, connection string, none |
| Ingestion mode | Polling, webhook, listening, streaming, file import, database query, one-time import |
| Frequency | Real-time, hourly, daily, weekly, manual |
| Record identification | Source record ID and deduplication fields |
| Change detection | Timestamp, version, checksum, status field |
| Pagination | Page number, offset, cursor, continuation token |
| Parsing | Record path, field extraction, date and unit conversion |
| Technical mapping | Source fields mapped to standard fields |
| Semantic mapping | Suggested entity types, observations, incidents, and risk definitions |
| Validation | Required fields, allowed values, and error handling |
| Confidence | AI confidence for each suggestion |

DataSource
ConnectorDefinition
ConnectorInstance
RawRecord
MappingSuggestion
Entity
Observation
Incident
RiskCategory
RiskSubcategory
RiskDefinition
RiskInstance
Relationship
