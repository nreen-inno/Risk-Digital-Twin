# Frontend V1 Demo -- AI Source Onboarding Redesign

## Objective

Redesign the **Source Onboarding** workflow to demonstrate an **AI-first
connector onboarding experience**.

This is a **frontend-focused implementation**. The backend AI already
exists in the project---reuse the existing architecture and AI
integration. Do not introduce mock AI responses or new backend APIs
unless absolutely necessary.

The objective is to make the application feel like an **AI Integration
Architect**, not a form wizard.

------------------------------------------------------------------------

# General principles

-   Keep the current application architecture.
-   Reuse existing components whenever possible.
-   Minimise code changes outside the onboarding workflow.
-   Do not redesign navigation or the rest of the application.
-   Prioritise a smooth demo experience over completeness.
-   AI should infer as much as possible from its own knowledge instead
    of asking unnecessary questions.
-   Missing information should be presented as **AI assumptions**, not
    as a questionnaire.

# 1. Replace the onboarding entry screen

Replace the current first onboarding question with:

**How would you like to onboard this source?**

-   ○ Let AI analyse the source
-   ○ I already have technical information

Remove the previous technical access decision workflow.

# 2. Option: "I already have technical information"

Keep the existing page as the basis and improve it.

## Technical information

Keep the existing large text area.

Users may paste:

-   API documentation
-   REST endpoints
-   Swagger/OpenAPI
-   JSON
-   XML
-   CSV
-   SQL
-   authentication description
-   technical notes
-   sample payloads

Display helper text:

> Provide any technical information you already have. Do not include
> passwords, API keys or access tokens.

## File attachment

Add an **Attach file** control.

Accepted file types:

-   pdf
-   docx
-   txt
-   md
-   json
-   yaml
-   yml
-   xml
-   csv

If backend upload is not implemented yet, UI-only support is acceptable.

## Analyse

Button:

**Analyse with AI**

Reuse the existing AI implementation already present in the project.

## AI Analysis

Replace long paragraphs with structured sections.

### Available information

Examples:

-   REST endpoint identified
-   OAuth authentication described
-   Sample payload available

### AI assumptions

Examples:

-   JSON API
-   Polling connector
-   OAuth2 authentication

### Missing information

Examples:

-   Rate limits
-   Refresh frequency
-   Pagination
-   Error handling

### Connector readiness

Display for example:

-   **Confidence: 92%**
-   **Connector can be generated.**

or

-   **Confidence: 58%**
-   **Additional information is recommended.**

## Refinement

Keep the existing **Describe changes** section.

Button:

**Update Analysis**

AI analyses again.

## Acceptance

Rename button to:

**Accept as Connector Specification**

The button should only be enabled if AI concludes that connector
generation can begin.

# 3. Option: "Let AI analyse the source"

This becomes the new AI-first workflow.

There should be **no interview** and **no sequence of AI questions**.

The selected source is already known because the user is inside Source
Onboarding.

Do **not** ask the user to enter the source name again.

## Optional AI instructions

Provide one optional input field.

Title:

**Additional instructions for AI (optional)**

Placeholder examples:

-   Monitor only financial news
-   Use Finnish and English
-   Check every hour
-   Focus on suppliers
-   Prefer official APIs over RSS

The field is completely optional.

If left empty, AI analyses the selected source using its own knowledge.

## Analyse

Button:

**Analyse with AI**

## AI Proposal

Display structured sections.

### Purpose

### Information source

### Recommended connector

### Monitoring

### Available information

Summarise what AI already knows.

### AI assumptions

Examples:

-   Public RSS exists
-   English language sufficient
-   No authentication required

### Information that would improve connector quality

Examples:

-   Preferred language
-   Internal feeds
-   Polling interval
-   Authentication details if available

### Connector readiness

Display:

-   Confidence
-   Ready / Not Ready

## Refinement

Keep the existing **Describe changes** field.

Examples:

-   Use Finnish RSS.
-   Poll hourly.
-   Monitor Wärtsilä.

AI updates the proposal.

## Acceptance

Button:

**Accept as Connector Specification**

Enable only if AI determines that connector generation can begin.

# 4. Presentation

Avoid long AI-generated paragraphs.

Present results using concise sections and lists.

The page should clearly communicate:

-   what AI already knows,
-   what AI assumes,
-   what information is still missing,
-   whether connector generation can start.

The proposal should be understandable by a **risk manager**, not only an
integration engineer.

# 5. UX goal

    Choose onboarding mode
            ↓
    AI analyses the source
            ↓
    Structured connector proposal
            ↓
    User optionally refines the proposal
            ↓
    Accept as Connector Specification

The application should feel like an experienced integration architect
that already understands most public systems and only asks for
information that genuinely cannot be inferred.

# Success criteria

For the demo, the workflow should convincingly demonstrate that:

-   AI performs most of the connector analysis.
-   Users provide only minimal guidance.
-   AI explains its assumptions transparently.
-   Connector readiness is clearly communicated.
-   The user can confidently accept the proposal as a Connector
    Specification, ready for the next stage of connector generation.
