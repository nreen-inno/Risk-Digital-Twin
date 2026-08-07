# Demo design notes — live evidence without a live crisis

**Captured from product discussion (Aug 2026)**  
**Scope:** From “we cannot guarantee a China headline / storm at demo time” through go-live thinking, presentation outline, and click-by-click demo.  
**Related:** `DEMO_SCRIPT_13_Aug.md`, `PRESENTATION_Path_to_Live_Use.md`

---

## 1. The constraint

You **cannot** promise that at a fixed demo moment a China export headline or a storm warning will fire.

So the demo must **not** depend on “something bad happens live.”

---

## 2. What we can always demonstrate

Separate two ideas:

| Concept | Meaning | Reliable without a crisis? |
|--------|---------|----------------------------|
| **Severity / score level** | “This risk is hot” | Unreliable from live news alone |
| **Confidence / evidence strength** | “We have more backing for this watch” | **Yes** — every successful collect can raise it |

Risk managers follow that: *more watching → more confidence*, even when the world is quiet.

---

## 3. Patterns that work with real news / weather

### Weather (easiest live proof)
Open-Meteo (or FMI) **always** returns something.

Demo line:  
*“We didn’t invent a storm — we attached yard conditions. Confidence on Weather factors goes up; if wind/gusts cross a threshold, severity can rise too.”*

Quiet day → still show factors activating as **live-backed**, confidence ↑; severity maybe only elevated.

### News (don’t wait for KIINA)
Don’t require a China crisis. Require **any thematically matching** items (sanctions, customs, trade, China in title).

Quiet day → *“No new crisis, but N relevant items → confidence on Export licensing / Tariff factors ↑.”*  
Empty match → honest empty + “add sanctions source,” not a fake spike.

### Structure first, live second (always reliable)
Case always has **named factors** (illustrative skeleton from the model).  
Live data **activates** factors: badge `illustrative` → `live-backed`, confidence fills, “last evidence” timestamp.

Optional later: “emerging factor candidate” from unmatched keywords.

### Replay / pinned sample (safety net)
Keep last good RawRecords. Demo uses **“latest collected evidence”**, not “streaming at this second.”

### Don’t fake a disaster
Markus can say: *“We’re not simulating a black swan in the room. We’re showing the twin **learns and firms up** as sources run.”*

---

## 4. What “new factors shown” means without a crisis

- **Activate** existing factors with live evidence (safest for Aug demo)  
- **Promote** a weak/placeholder factor when evidence appears  
- **Suggest** emerging factor candidates (AI / unmatched cluster) — explain as proposed, not certified  

For demo: **activate + confidence ↑** is enough and honest.  
**Decision taken:** implement **both** activation/confidence **and** a small **score tick**.

---

## 5. Practical demo shape (before → after)

1. Case open → factors mostly illustrative, confidence low / baseline score  
2. Sources already In use (or approve one) → Fetch  
3. Back to case → same factors **live-backed**, confidence higher, real headlines/weather rows  
4. Overview tile: evidence freshness / score bump even if severity only ticks slightly  

**Bottom line:** Don’t need “something happens in the moment.” Need **guaranteed collect → visible confidence/evidence change** (and a modest score move).

---

## 6. What we implemented for that story

### Live enrichment behaviour
When matching RawRecords exist for a risk case:

| Before | After |
|--------|--------|
| Factors **illustrative** | Factors **live-backed** (+ optional **emerging** cluster) |
| Baseline factor confidence | Confidence **↑** |
| Case score = baseline | Score **baseline → higher** (capped bump) |
| Overview tile flat | Tile can show **+N live** / live-backed count |

Quiet weather still works: Open-Meteo always returns data → wind/precip-related factors can activate.

### Weather published case
- Case id: `yard-weather-disruption`  
- Under **Weather & Natural Hazards**  
- Title: yard weather exposure (wind, precip, outdoor work)  
- **Sea trial delay** stays **in preparation** (not a second copy of the same published case)  
- API also **dedupes** so one `caseId` cannot appear twice on the cases list  

### UI cues
- Case header: `Score 42→52 · +N live`, live-backed / confidence badge  
- Factors: `live-backed · N signals · conf 48→62%` vs `illustrative`  
- Overview tiles: “Live evidence +N” when bump exists  

---

## 7. Stronger demo beat (replaced weak “signals list only”)

Earlier weakness: live sources only attached a side list to a pre-written case — felt like a panel, not the twin working.

**Stronger beat:**

**A. Case open — baseline**  
Factors illustrative / low live; note score.

**B. Bridge to Configure** (same MO)  
Approve or fetch a **theme-matching** source (Open-Meteo for Weather; sanctions/trade/YLE for Geopolitical — not weather for China).

**C. Back to case — delta**  
Factor → live-backed; signals under it; score tick; overview tile updates.

That delta is the customer benefit: *adding watching changes what the twin believes.*

---

## 8. Path to real use (not only a signalling toy)

### What “real” means vs demo
Demo = illustrative scores + a few live connectors + believable cascade.  
**Real** = owners, trusted sources, repeatable collection, evidence-backed posture people act on, signal → decision → follow-up.

Primarily an **early-warning / signalling twin** — but “only signals” is not enough for adoption.

### What customers must do
1. Own the watch model (objectives, definitions, owners)  
2. Bring real sources (external + **internal**; access/legal/credentials)  
3. Define what action means (notify, decide, close)  
4. Operating rhythm (weekly review, escalate, retune)  
5. Governance (who approves sources; illustrative vs live; audit)

### What we must implement / harden
| Workstream | Outcome |
|------------|---------|
| Connector depth | Reliable collect; clear open / key / bulk / enterprise |
| Relevance & scoring | Profile → factors → confidence/score for real |
| Case lifecycle | Emerging → approved factors/cases |
| Internal data path | First yard/supplier feed |
| Actions & feedback | Assign, status, false-alarm learning |
| Notifications | Teams/email on threshold |
| Roles & security | Exec vs risk manager vs admin |
| Operations | Keys, failed polls, retention |

### Beyond signalling
1. Shared risk language  
2. Evidence pack for steering  
3. Change detector (add source → posture moves)  
4. Bridge to existing registers (don’t rip-replace)  
5. Learning loop from dismissals/outcomes  

**Not v1:** autopilot procurement, perfect prediction, replacing judgment.

### Phased pilot
- **A:** 1–2 objectives (e.g. Geopolitical + Weather), few real sources, live-backed + notify  
- **B:** Supplier/internal + action tracking  
- **C:** Scale MOs, bulk/sanctions, ERP-grade APIs, richer AI  

**Close line for Markus:**  
*We start as an early-warning twin: you choose what to watch and plug in real sources; we turn that into live confidence and risk cases with a supplier→yard story — then you decide, and we learn whether the signal was useful.*

---

## 9. Presentation artefact

Slide-ready deck (extend for demo leave-behind):

**`PRESENTATION_Path_to_Live_Use.md`**

Includes:

- Workshop → value story  
- Two doors (overview vs configure)  
- Conceptual + simplified **data model**  
- You vs us go-live  
- Beyond signalling  
- Pilot phases + ask  
- Appendix: what else to add (security, integrations, RACI, FAQ)

Use **slides 1–8** with the live demo; **9–14** only if they ask how it works / go-live.

---

## 10. Click-by-click operator path (current app)

### Setup
- Backend + frontend running  
- Prefer: Open-Meteo **In use** on Weather (and/or YLE/sanctions on Geopolitical)  
- Start at **/** Risk overview  

### Steps
0. **Land on Risk overview** — board language; don’t open Configure first  
1. Click **Geopolitical & Regulatory** tile → cases list  
2. Click **China export restrictions…** → case  
3. Show title / score / what is happening / impact  
4. Scroll **How it spreads** — left→right cascade to yard  
5. Scroll evidence + expand a factor (illustrative vs live-backed)  
6. Scroll **What should we do**  
7. Short bridge: **open sources** or **Configure sources** — show In use source  
8. Optional strong beat: **Weather** tile → yard weather case → Fetch Open-Meteo if needed → refresh → score/confidence delta  
9. Close on overview — same model for China, weather, suppliers  

### Timing (~12 min)
Overview 2′ · China case 6′ · Sources 2′ · Weather delta 2′ · Close 1′  

If Weather has no live bump, skip step 8.

### Extra terminal in Cursor
**Ctrl+Shift+`** or Terminal → New Terminal (+ in panel) — one for backend, one for frontend.

---

## 11. Design principles to keep

1. Demo must not require a live crisis.  
2. Prefer **confidence / live-backed** as the guaranteed story; severity is a bonus.  
3. Honest labelling: illustrative baseline vs live evidence.  
4. Exec consumes overview/cases; risk managers configure sources.  
5. Signalling is the core; adoption needs owners, actions, rhythm, and at least one internal source path.

---

*End of captured discussion thread.*
