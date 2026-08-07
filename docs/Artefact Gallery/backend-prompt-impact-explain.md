# Backend change request — `impacts[].explain` (Enterprise Impact calculation transparency)

For the backend author. The Risk Room case page (`RiskCasePage.jsx`) has been upgraded so every **Enterprise Impact** tile can reveal the reasoning behind its number: hover shows a plain-language definition (Layer A), click expands the full calculation — formula, inputs, sources, assumptions, confidence (Layer B). The frontend already renders this from an optional `explain` object on each impact item and **degrades gracefully** when it's absent (the tile looks exactly as it does today). This request is to populate that object on the risk-case payload.

## 1. Where it fits

A risk case's `impacts[]` are the quantified enterprise consequences of a **RiskSignal**. Each impact figure should carry its own working, generated **alongside the RiskSignal** (in the AI-enrichment / risk-signal service) so the number and its explanation come from one place and cannot drift apart. This mirrors the platform principle already in use: the risk **score** is produced by the transparent `riskModel.js` (likelihood × impact); the impact figures should be equally inspectable and, wherever possible, **traceable to evidence and source** (RawRecord → enrichment → RiskSignal).

Pipeline reminder (unchanged): `Information Source → Connector → RawRecord → Pre-filter → AI Enrichment → RiskSignal → Dashboard`. The `explain` object is attached where the RiskSignal's impacts are computed.

## 2. API — extend the risk-case payload

`GET` risk case (consumed by `getRiskCaseById`). Today each `impacts[]` item is `{ value, label }`. Add an optional `explain`:

```json
{
  "value": "+11%",
  "label": "Weighted landed cost on affected categories",
  "explain": {
    "what": "Plain-language definition of what this metric measures.",
    "formula": "Σ ( category spend share × category landed-cost increase )",
    "inputs": [
      {
        "k": "Specialty steel — 45% of affected spend × +14%",
        "v": "+6.3%",
        "source": "Internal ERP / Procurement",
        "evidenceRef": "rawRecord:abc123"
      }
    ],
    "result": "Weighted total = 6.3 + 2.7 + 2.0 = +11.0%",
    "assumptions": [
      "Current category spend mix holds over the horizon.",
      "Tariff applies to the full category, not a sub-set of HS codes."
    ],
    "sources": ["Internal ERP / Procurement", "Customs authority bulletins", "MEPS steel price"],
    "confidence": 80,
    "updated": "2026-08-06T09:00:00Z"
  }
}
```

Field notes:
- `what` — one or two sentences, understandable by an executive (not an engineer).
- `formula` — human-readable, not code. The relationship, not a runnable expression.
- `inputs[]` — the operands. `k` = label, `v` = value as displayed. `source` = human-readable source name (**required** where the input is data-derived; use `"derived"` for intermediate results). `evidenceRef` = **optional** pointer to the RawRecord / signal the input came from, for a future "inspect evidence" drill-down.
- `result` — the arithmetic that ties the inputs to `value`. It should be reconstructible from `inputs` (see acceptance).
- `assumptions[]` — genuine modelling assumptions (horizon, scope, "no mitigation applied"), not test tasks.
- `sources[]` — the distinct sources behind the metric (superset of the `inputs[].source` values).
- `confidence` — number. Accept 0–1 or 0–100; the frontend normalises. Reflects the *figure's* reliability (a factual count like "4 of 6" is high; a 12-month projection is lower).
- `updated` — ISO 8601 preferred; a relative string ("3h ago") is tolerated.

`explain` is **optional** end-to-end. Omit it (or any sub-field) and the tile still renders — never block a payload because the working isn't ready.

## 3. System prompt (impact-explanation generation)

Use when the risk-signal service asks the model to produce impacts with their working:

```
You produce the Enterprise Impact figures for a shipbuilding Risk Signal, and for
each figure the working behind it, so an executive can see what the number means
and how it was derived.

For every impact return: value, label, and an explain object with — what (plain
language), formula (the relationship in words), inputs (each operand with its value
and the SOURCE it came from), result (arithmetic tying inputs to value),
assumptions (modelling choices only), sources, confidence, updated.

Rules:
- Ground every data-derived input in a named source; where an input traces to a
  collected record, include its evidence reference. Mark intermediate values
  "derived".
- The result must be reconstructible from the inputs — do not state a figure the
  inputs cannot produce.
- Confidence reflects THIS figure's reliability: factual counts high; multi-quarter
  projections lower. Do not inflate.
- assumptions are modelling assumptions (horizon, scope, mitigation on/off), never
  tasks for a user.
- Keep `what` executive-readable. Return ONLY the JSON for the impacts array.
```

## 4. Context to pass into the prompt

```json
{
  "riskCase": { "id": "", "riskDefinition": "", "score": 0, "level": "", "summary": "" },
  "monitoringObjective": { "id": "", "name": "" },
  "signalEvidence": [ { "sourceName": "", "rawRecordId": "", "snippet": "" } ],
  "portfolioContext": { "programmes": [], "affectedSpend": null, "currency": "EUR" }
}
```

Where portfolio figures (spend, programme counts, slot capacity) are available from ERP / programme systems, pass them so `inputs` cite real values instead of estimates.

## 5. Acceptance criteria

- Each `impacts[]` item may include a valid `explain`; items without one still render unchanged (backward compatible).
- `result` is reconstructible from `inputs` — a reviewer can add the operands and reach the stated `value` (± rounding). No orphan numbers.
- Every data-derived `input` names a `source`; at least one metric per case carries an `evidenceRef` where a RawRecord exists.
- `confidence` is present and honestly scaled (counts high, projections lower).
- Payload validates and the endpoint never fails because `explain` is missing or partial.

## 6. Out of scope

The deeper full-breakdown side-drawer (Layer C — step-by-step derivation with raw-record links) is **not** part of this request. `evidenceRef` is included now so that drawer can be added later without a schema change.
