# Backend change request — Connector-recommendation AI prompt, schema & objects

For the backend author. The frontend onboarding (Source Onboarding) has been upgraded to send the improved instruction and to render a structured Connector Proposal with a three-way uncertainty split and proper readiness states. For it to fully populate, the `POST /api/information-sources/:id/connector-advice` endpoint should (a) use the system prompt below, (b) return the JSON schema below, and (c) receive Monitoring-Objective context. Introduce ConnectorProposal / ConnectorSpecification / ConnectorTestResult objects.

## 1. System prompt (connector recommendation)

```
You are the connector architecture assistant for the Risk Digital Twin. Create a
practical Connector Proposal for the selected Information Source and Monitoring
Objective, in one pass, with no interview.

Onboarding lifecycle (you produce the Connector Proposal):
Monitoring Objective -> Information Source -> Connector Proposal -> Connector
Specification -> Connector Definition -> Automated Connector Test -> Active Connector.

Runtime pipeline (created LATER by the platform, not by this connector):
Connector -> RawRecord -> Pre-filter using Monitoring Profile -> AIEnrichment ->
RiskSignal -> Dashboard.

The connector's responsibility is COLLECTION and canonical field mapping only. Do
not place business-risk interpretation inside source-specific connector logic;
downstream pre-filter, enrichment and risk-signal services handle relevance and
risk interpretation.

Resolve publicly available technical facts YOURSELF (official provider identity,
documentation, connection methods, endpoints, authentication, formats, query
parameters, public terms/limits). Do NOT ask the risk manager to locate
documentation, endpoints, identifiers, field names, API details or other publicly
discoverable technical facts. Propose sensible defaults instead of open questions.

Classify every remaining uncertainty into EXACTLY three groups:
1. automatedValidationPlan — facts the automated connector TEST must verify
   (endpoint availability, actual fields/format, identifier/GUID stability,
   deduplication, parsing/encoding/errors, rate limits, pagination, field-mapping
   confirmation). Not user homework.
2. decisionsRequiringUserApproval — business choices only the risk manager should
   approve (business scope, languages, geographic coverage, sensitivity,
   risk-category mapping, accept/modify).
3. unresolvedTechnicalFacts — public technical facts you could not reliably find.
   Use ONLY after genuine research fails; "probably has RSS" is discoverable.

Keep "assumptions" for genuine BUSINESS assumptions that depend on business intent
and can be shown to the risk manager. Never present connector-test tasks as
questions for the risk manager.

Use the existing Monitoring Objective and risk taxonomy to propose monitoring
scope, geographic scope, languages, a Monitoring Profile, risk-category mappings
and sensitivity.

Connector readiness states (pick the honest one; do not report "not ready" merely
because something is unverified):
- proposal-ready: enough info to recommend a configuration.
- ready-for-test: a Connector Specification can be created and auto-tested (allowed
  even before a live fetch validated every field).
- test-failed: endpoint or mapping did not work.
- ready-for-activation: automated test passed.

Return ONLY the JSON object defined by the schema. The result must be
understandable by a risk manager, not only an integration engineer.
```

## 2. Output JSON schema (returned inside `connectorAdvice`, or top-level)

```json
{
  "source": { "name": "", "provider": "", "sourceType": "" },
  "recommendation": {
    "connectionMethod": "rss|api|file|database|email|scrape",
    "rationale": "",
    "alternativeMethods": [ { "method": "", "status": "recommended|not-recommended", "reason": "" } ]
  },
  "technicalConfiguration": {
    "endpoint": "", "documentationUrl": "", "authenticationType": "none|apiKey|oauth2|basic",
    "pollInterval": "PT6H", "responseFormat": "", "proposedFieldMapping": {}
  },
  "monitoringConfiguration": {
    "languages": ["fi","en"], "geographicScope": [], "sensitivity": "balanced",
    "riskCategoryMappings": [],
    "monitoringProfile": { "includeTerms": [], "excludeTerms": [], "entities": [], "locations": [] }
  },
  "retentionRecommendation": { "storeFeedMetadata": true, "storeRawFeedItem": true, "scrapeFullArticle": false, "reason": "" },
  "automatedValidationPlan": [],
  "decisionsRequiringUserApproval": [],
  "unresolvedTechnicalFacts": [],
  "assumptions": [],
  "confidence": 0.0,
  "connectorReadiness": "proposal-ready|ready-for-test|test-failed|ready-for-activation"
}
```

The frontend also accepts array items as objects (`{ "statement": "...", "verificationStep": "..." }` or `{ "type": "business-assumption", "statement": "...", "proposedValue": true, "userCanOverride": true }`).

## 3. Context to pass INTO the prompt

```json
{
  "monitoringObjective": { "id": "", "name": "", "description": "", "linkedRiskCategories": [] },
  "informationSource": { "name": "", "type": "", "provider": "" },
  "existingRiskTaxonomy": [],
  "platformDefaults": { "defaultPollInterval": "PT6H", "defaultLanguages": ["fi","en"], "defaultSensitivity": "balanced", "rawRecordRetentionDays": 90 }
}
```

(The frontend currently passes source + objective context via the business-access `notes` instruction; ideally the backend reads the Monitoring Objective from Cosmos directly and injects it.)

## 4. Objects to introduce

- **ConnectorProposal** (transient or versioned): AI recommendation, alternatives, proposed business scope, user approvals.
- **ConnectorSpecification** (stored): accepted configuration — endpoint, authentication type, schedule, mappings, source assignment, Monitoring Profile reference.
- **ConnectorTestResult** (stored): connectivity, detected schema, sample field mapping, deduplication result, parser result, errors/warnings, activation readiness.

Lifecycle: ConnectorProposal → (accept) → ConnectorSpecification → Automated Connector Test → ConnectorTestResult → (pass) → Active Connector. Suggested endpoints (from the backend reference architecture): `POST /api/connectors/analyse`, `POST /api/connectors/test`, `POST /api/connectors/activate`.

You do NOT need the full runtime pipeline before improving onboarding — but the prompt must know the downstream pre-filter, enrichment and risk-signal services exist, so it stops trying to put all intelligence and all uncertainty into the connector recommendation itself.
