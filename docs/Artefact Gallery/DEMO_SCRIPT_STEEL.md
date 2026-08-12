# Demo script — Steel supply & cost pressure (Aug 2026)

**Primary hero:** Commodity & Energy → **Steel supply & cost pressure**  
**Case id:** `steel-supply-cost-pressure`  
**Why steel over oil:** Direct shipbuilding input; fewer reasoning hops than Brent → freight → yard.

**Live context (Aug 2026):** European HRC edging higher; EU safeguard from July 2026 (18.3 Mt duty-free quota, 50% out-of-quota duty); CBAM definitive regime. Sources need **not** mention Meyer Turku — exposure is via material input logic.

---

## What is implemented vs target

| Step in your script | Today |
|---------------------|--------|
| Add EU Trade / steel source | Real (AI connector onboarding) |
| Collect RawRecords | Real |
| Connectivity sample (unfiltered) | Real — label says so |
| Published steel Risk Case room | **Implemented** (seed + live enrichment) |
| AI auto-creates case from signals | **Not yet** — case is seeded; live evidence **activates** factors |
| AI-suggested second case (oil/energy) | Stub row: “Energy and logistics cost escalation” + Accept/Reject |
| “Does not claim Meyer affected” | In case `aiInsight` + summary copy |

**Honest demo line:** *“The case structure is ready; live EU Trade feed firms up factors and confidence. Full auto-case creation from clusters is the next product slice.”*

---

## Prep (before room)

- [ ] Backend + frontend running  
- [ ] **Commodity & Energy** objective — add **EU Commission Trade news RSS**  
  `https://ec.europa.eu/newsroom/trade/feed?item_type_id=1103&lang=en&orderby=item_date`  
- [ ] AI proposal: include terms around steel, HRC, quota, CBAM, safeguard; poll **2× daily** (`PT12H`)  
- [ ] Approve connectivity sample → **In use**  
- [ ] Optional second source: steel-market RSS or MEPS (REST) when available  
- [ ] Tab: `/risk-cases/steel-supply-cost-pressure`

---

## Click path (~10 min)

### 1. Overview (1 min)
**/** → tile **Commodity & Energy Prices** → case list → **Steel supply & cost pressure**.

**Say:** *“External steel news doesn’t need our name — if it moves European plate availability or price, we reason to shipbuilding exposure.”*

### 2. Case room (4 min)
Show:
- Summary (exposure pathway, not “Meyer already hit”)
- Factors: HRC prices, EU quota, availability, CBAM
- Network: EU policy + market news → factors → steel risk → budget / late delivery → margin & schedule
- Enterprise impacts (click one explain tile)
- Actions: monitor plate, forward-buy, alternate mills

### 3. Sources (3 min)
**Manage sources** → EU Trade RSS In use → View operational details (filters/topics, last collection).

**Fetch / refresh** if needed → back to case → show live-backed factors / score tick / evidence funnel.

**Say:** *“Multi-source: Commission measure + market article = intelligence, not keyword alert on ‘Meyer’.”*

### 4. Human gate (1 min)
Case list → **Energy and logistics cost escalation** (AI suggested) → Accept or Reject.

**Say:** *“Oil/shipping is a second pathway — human decides if it’s worth a separate watch.”*

### 5. Close (1 min)
*“Same model as China and weather: watch → evidence → case → yard impact. Steel is the cleanest shipbuilding demo because the input link is obvious.”*

---

## Trigger (target product — explain if asked)

Create or **update** the steel case when new evidence shows material movement in:
- European steel **price** (HRC/plate)
- **Availability** / lead times
- **Import restrictions** (quota, safeguard, CBAM)

Tomorrow’s article → **same case**, more evidence (not a new case unless theme is genuinely different, e.g. pure oil shock → energy suggested case).

---

## Backup: oil chain (secondary)

If audience pushes energy: use suggested **Energy and logistics cost escalation** — explain Brent ~$89 / Middle East shipping as *pathway* (energy → freight → European suppliers → potential schedule/cost pressure), not as confirmed Meyer impact.
