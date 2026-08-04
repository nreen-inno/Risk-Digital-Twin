# Claude Implementation Prompt
## Improve AI Connector Recommendation and Onboarding

### Objective

Redesign the AI-powered connector recommendation so that it behaves as an experienced Solution Architect rather than a consultant asking the user to perform technical research.

The target users are **risk managers**, not software developers.

The onboarding should produce a high-quality **Connector Proposal** that can later become a **Connector Specification** after user approval and automated connector testing.

---

# Existing Runtime Architecture

The onboarding prompt MUST understand that the runtime architecture already exists.

```
Monitoring Objective
        ↓
Information Source
        ↓
Connector
        ↓
RawRecord
        ↓
Monitoring Profile Pre-filter
        ↓
AI Enrichment
        ↓
Risk Signal Engine
        ↓
Dashboard
```

The connector is ONLY responsible for collecting information and mapping it into canonical RawRecords.

Business interpretation belongs later in the pipeline.

---

# Connector Lifecycle

```
Information Source
        ↓
Connector Proposal
        ↓
Connector Specification
        ↓
Connector Definition
        ↓
Automated Connector Test
        ↓
Activated Connector
```

The onboarding creates the Proposal and Specification.

---

# Responsibilities

## AI MUST

- Discover public technical information.
- Find official documentation.
- Find official RSS/API endpoints.
- Recommend the best connection method.
- Recommend polling frequency.
- Recommend authentication method.
- Recommend monitoring scope.
- Recommend risk mappings.
- Recommend sensible defaults.
- Explain genuine uncertainty.

Never ask the user to discover publicly available information.

---

## Automated Connector Test MUST

Validate automatically:

- endpoint availability
- schema
- available fields
- GUID stability
- canonical URLs
- deduplication
- parser
- encoding
- pagination
- rate limits
- field mapping

These are NOT questions for the user.

---

## Risk Manager MUST decide only

- business scope
- geographic scope
- languages
- monitoring sensitivity
- proposed risk mappings
- activate connector

---

# Required Prompt Behaviour

Never ask users questions like:

- Find documentation URL
- Find RSS endpoint
- Find API endpoint
- Does the feed contain GUID?
- Does the feed contain categories?
- Does it support filtering?

Instead AI should discover these itself and propose defaults.

---

# New Output Structure

Replace

- Available Information
- AI Assumptions
- Information that would improve connector quality

with

## Recommended Configuration

- provider
- connection method
- endpoint
- authentication
- polling interval
- rationale

## AI-resolved Technical Details

- documentation URL
- response format
- expected fields
- identifiers
- copyright notes
- field mapping

## Business Scope

- geography
- languages
- monitoring profile
- risk mappings
- sensitivity

## Automated Validation Plan

Items that connector testing will verify.

## Decisions Requiring User Approval

Business decisions only.

## Assumptions

Only real business assumptions.

## Connector Readiness

proposal-ready
ready-for-test
test-failed
ready-for-activation

---

# Prompt Context

The AI receives:

- Monitoring Objective
- Information Source
- Existing Risk Taxonomy
- Platform defaults

The AI must use these when generating recommendations.

---

# Structured Output

Return structured JSON equivalent to:

- source
- recommendation
- technicalConfiguration
- monitoringConfiguration
- retentionRecommendation
- automatedValidationPlan
- decisionsRequiringUserApproval
- unresolvedTechnicalFacts
- assumptions
- confidence
- connectorReadiness

---

# Example: YLE

For YLE the AI should:

- recommend official RSS
- locate documentation itself
- locate feed endpoint itself
- recommend Finnish + English
- recommend balanced sensitivity
- recommend political/logistics/supply-chain/labour monitoring
- recommend storing RSS metadata only
- recommend connector test for schema validation

The user should only approve business scope.

---

# Goal

The onboarding experience should feel like working with an experienced Enterprise Architect:

- AI researches.
- AI recommends.
- Connector Test verifies.
- Risk Manager approves.

Not:

- AI asks the risk manager to perform technical discovery.
