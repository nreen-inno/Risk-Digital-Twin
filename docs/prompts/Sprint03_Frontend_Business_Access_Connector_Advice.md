# Sprint 3 Frontend – Business Access and Connector Advice

## Context

You are continuing development of the existing **Risk Digital Twin** application.

Use the code currently open in this local Git workspace as the only source of truth.

The repository already contains the latest frontend and backend from `main`.

Work only on the current frontend development branch.

Do not create a new project.

Do not initialise a new Git repository.

Do not switch branches.

Do not modify backend files.

Do not modify repository structure.

Do not commit or push.

Work only inside:

`frontend/`

The existing Monitoring Objectives and AI Source Advisor screens must continue to work with minimal or no redesign.

---

# Goal

Extend the existing Information Sources workflow so that an accepted AI recommendation becomes a persistent Information Source and the user can review:

1. Business access
2. Subscription or registration situation
3. AI-generated access guidance
4. AI Connector Advisor recommendations

The page should guide a risk manager through the next practical steps without exposing unnecessary technical details.

The experience should feel like an intelligent enterprise workflow, not a CRUD form.

---

# Existing Backend Endpoints

## 1. Accept an AI recommendation

**POST**

`/api/information-sources/from-recommendation`

Request body:

```json
{
  "monitoringObjectiveId": "supplier-stability",
  "recommendation": {
    "id": "bisnode-dun-bradstreet-finland",
    "name": "Dun & Bradstreet supplier risk insights",
    "provider": "Dun & Bradstreet",
    "informationNeed": "Supplier financial condition and insolvency early warning",
    "sourceRole": "external",
    "businessValue": "Provides early warning of supplier financial deterioration.",
    "shortReason": "Closes the supplier financial-health coverage gap.",
    "availabilityStatus": "subscriptionRequired",
    "availabilityLabel": "Subscription required",
    "recommendationType": "Industry Standard",
    "priority": 1,
    "confidence": 0.78,
    "nextSteps": [
      "Check whether the organisation already has access."
    ],
    "limitations": [
      "Coverage varies by supplier country."
    ]
  }
}
```

Response:

```json
{
  "created": true,
  "duplicate": false,
  "item": {
    "id": "...",
    "objectType": "informationSource"
  }
}
```

If the recommendation was already accepted:

```json
{
  "created": false,
  "duplicate": true,
  "item": {
    "id": "...",
    "objectType": "informationSource"
  }
}
```

The frontend must treat both responses as successful.

---

## 2. Save Business Access answers

**PATCH**

`/api/information-sources/:id/business-access`

Example request:

```json
{
  "accessKnown": "yes",
  "organisationHasSubscription": "yes",
  "internalOwner": "Finance",
  "contactDepartment": "Finance and Procurement",
  "providerPortal": "",
  "notes": "Finance already uses this service.",
  "decisionStatus": "accessAvailable"
}
```

Allowed values:

### accessKnown

- `yes`
- `no`
- `unknown`

### organisationHasSubscription

- `yes`
- `no`
- `unknown`
- `notRequired`

### decisionStatus

- `pending`
- `accessAvailable`
- `actionRequired`
- `notProceeding`

---

## 3. Load Access Guidance

**GET**

`/api/information-sources/:id/access-guidance`

Example response:

```json
{
  "informationSourceId": "...",
  "sourceName": "Dun & Bradstreet supplier risk insights",
  "availabilityStatus": "subscriptionRequired",
  "businessAccess": {
    "accessKnown": "yes",
    "organisationHasSubscription": "yes",
    "internalOwner": "Finance",
    "contactDepartment": "Finance and Procurement",
    "decisionStatus": "accessAvailable"
  },
  "guidance": {
    "readiness": "partiallyReady",
    "title": "Existing subscription confirmed",
    "summary": "Contact Finance and request authorised access for this use case.",
    "nextActions": [
      "Confirm the licensed product and permitted usage.",
      "Request credentials or a service account.",
      "Obtain provider documentation or a sample export."
    ],
    "canProceedToConnector": true
  }
}
```

Possible readiness values:

- `ready`
- `partiallyReady`
- `actionRequired`
- `unknown`

---

## 4. Load AI Connector Advice

**POST**

`/api/information-sources/:id/connector-advice`

Request body:

```json
{}
```

Example response:

```json
{
  "informationSourceId": "...",
  "sourceName": "...",
  "generatedBy": "azureOpenAI",
  "generatedAt": "...",
  "accessGuidance": {
    "readiness": "partiallyReady"
  },
  "connectorAdvice": {
    "readiness": "actionRequired",
    "summary": "Business access exists, but technical connection entitlement and documentation must still be confirmed.",
    "recommendedApproach": {
      "connectionMethod": "Provider-supported data connection",
      "refreshFrequency": "Daily",
      "expectedData": [
        "Supplier credit status",
        "Financial-risk indicators",
        "Company status changes"
      ],
      "rationale": "A controlled periodic connection is appropriate for supplier-risk monitoring."
    },
    "requiredBeforeConnection": [
      "Confirm the licensed provider product.",
      "Obtain technical documentation.",
      "Request authorised credentials."
    ],
    "missingInformation": [
      "Technical documentation",
      "Credentials",
      "Sample response"
    ],
    "assumptions": [],
    "estimatedComplexity": "medium",
    "canGenerateConnectorDefinition": false,
    "confidence": 0.82
  }
}
```

Possible complexity values:

- `low`
- `medium`
- `high`
- `unknown`

---

# Required User Flow

## Step 1 – Accept recommendation

The existing Accept button currently updates only local UI state.

Change it so that it also calls:

`POST /api/information-sources/from-recommendation`

After a successful response:

- store the returned Information Source ID;
- mark the recommendation as accepted;
- treat `duplicate: true` as success;
- show a small confirmation;
- enable the next step.

Do not create duplicate objects in the frontend.

---

## Step 2 – Open Source Details

After accepting a recommendation, allow the user to open a **Source Details** workspace.

This may be:

- a new page;
- a full-width workflow panel;
- or a large modal/drawer if this fits the existing architecture better.

Prefer a page if routing already supports it.

Suggested route:

`/information-sources/:id`

Do not redesign the Monitoring Objectives page.

Do not significantly redesign the current AI Source Advisor page.

---

# Source Details Layout

Create three clearly separated sections.

## A. Source Overview

Show:

- Source name
- Provider
- Information need
- Recommendation type
- Availability
- Short reason
- Business value

Use existing visual language and design system.

---

## B. Business Access Review

Ask practical business questions.

### For subscription-required sources

Show:

**Does your organisation already have a subscription?**

- Yes
- No
- I do not know

Optional fields:

- Internal owner
- Responsible department
- Provider portal
- Notes

Suggested departments:

- Finance
- Procurement
- Compliance
- IT
- Quality
- Other

Map answers to the backend values.

### For registration-required sources

Ask whether an authorised organisation account already exists.

### For customer-access-required sources

Ask whether internal access has already been confirmed.

### For upload-required sources

Explain that a sample export or file will be required later.

### For available-now sources

Do not show irrelevant subscription questions.

Display:

> No commercial subscription is required.

Set:

`organisationHasSubscription = "notRequired"`

The Save/Continue action should call the PATCH endpoint.

---

## C. Access Guidance

After saving Business Access answers, call:

`GET /api/information-sources/:id/access-guidance`

Display:

- Readiness badge
- Guidance title
- Summary
- Next actions
- Whether the source can proceed to Connector Advice

Do not expose raw JSON.

Suggested readiness presentation:

- Ready
- Partially ready
- Action required
- Unknown

---

# AI Connector Advisor Section

When access guidance allows it, or when the user explicitly requests advice, call:

`POST /api/information-sources/:id/connector-advice`

This request may take up to 90 seconds.

Use a clear AI loading state.

Show:

- Readiness
- Summary
- Recommended connection method
- Recommended refresh frequency
- Expected data
- Required actions
- Missing information
- Estimated complexity
- Confidence as a visual indicator, not a decimal
- Whether Connector Definition generation is currently possible

Do not expose low-level technical configuration forms.

Do not ask for passwords or credentials.

Do not implement Connector Definition generation yet.

If `canGenerateConnectorDefinition` is false, show the reason and required actions.

If true, show a disabled or placeholder button:

`Generate Connector Definition – Sprint 4`

---

# Four Demo Paths

The UI must support these four different cases.

## 1. Existing subscription

Show:

- Business access confirmed
- Contact internal owner
- Obtain credentials and provider documentation
- Connector Advice available

## 2. Subscription does not exist

Show:

- Commercial subscription required
- Review provider options
- Request quotation or trial
- Ask AI for a public alternative
- Connector generation not available

The public-alternative action can be a Sprint 4 placeholder.

## 3. User does not know

Show:

- Check with Finance, Procurement, Compliance or IT
- Existing organisation-wide agreement may already exist
- Connector generation not available

## 4. Public source available now

Show:

- No subscription required
- Confirm scope, companies, countries or topics
- Proceed directly to Connector Advice

---

# API Layer

All network calls must remain in:

`frontend/src/services/api.js`

Components must not call `fetch()` directly.

Add reusable API functions for:

- accepting a recommendation;
- updating business access;
- loading access guidance;
- loading connector advice.

Use the existing `ApiError` approach.

AI requests should use a longer timeout, for example 90 seconds.

---

# Suggested Components

Reuse existing components where possible.

Possible new components:

- `SourceDetailsPage`
- `SourceOverview`
- `BusinessAccessForm`
- `AccessGuidancePanel`
- `ConnectorAdvicePanel`
- `ReadinessBadge`
- `ComplexityBadge`
- `AiLoadingState`

Keep components focused and reasonably small.

Do not create a second design system.

---

# State and Error Handling

Handle:

- loading;
- successful save;
- duplicate acceptance;
- validation errors;
- backend offline;
- AI request timeout;
- AI fallback result;
- retry.

Do not lose completed form values when a guidance or advice request fails.

---

# Visual and UX Requirements

Maintain the existing premium enterprise design.

The experience should feel like:

> AI helps me understand whether this source can be used, what I need to obtain, and what connection approach is appropriate.

Avoid:

- dense technical forms;
- walls of text;
- raw API terminology;
- raw confidence decimals;
- unnecessary modal dialogs.

Use progressive disclosure.

Long lists such as missing information and assumptions should be collapsible.

---

# Git and Scope Rules

Before changing files, verify the current branch:

```bash
git branch --show-current
```

Work only on the active frontend sprint branch.

Do not switch branches.

Do not initialise Git.

Do not commit.

Do not push.

Do not modify:

- `backend/`
- backend API contracts
- Cosmos DB model
- root repository structure

Only change `package.json` if a dependency is genuinely required. Prefer the existing dependency set.

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

- Monitoring Objectives still works.
- AI Source Advisor still works.
- Accept persists the recommendation.
- Duplicate acceptance is handled.
- Business Access saves correctly.
- Access Guidance loads.
- Connector Advice loads.
- Public and commercial access states render correctly.
- No frontend console errors are introduced.

Return:

1. Changed files
2. Component tree
3. API functions added
4. Short explanation of UX decisions
5. Any assumptions or unresolved issues

Do not commit.

Do not push.
