# Demo script — Risk Digital Twin (13 Aug)

**Hero path:** External signal → supplier pressure → yard impact → action  
**Hero objective:** Geopolitical & Regulatory  
**Hero case:** China export restrictions & tariffs (`risk-cases.html#c2`)  
**Real product beat:** Source onboarding (YLE / EUR-Lex) already live  

Audience: risk / programme stakeholders who brainstormed *Ulkoiset riskit* (external risks → suppliers → yard).

---

## 0. Setup (before the room)

- [ ] Backend + frontend running; Cosmos + Azure OpenAI env OK  
- [ ] At least one **In use** source on Geopolitical (YLE and/or EUR-Lex), frequency visible  
- [ ] Browser tabs ready:
  1. App — `/` Risk overview (home)
  2. App — `/risk-cases/customs-trade-disruption` (hero case)
  3. App — `/configure/objectives` or Geopolitical workspace (sources)
  4. Optional Artefact Gallery HTML — reference only, not the live demo path
- [ ] Optional: open YLE sample / raw records once so “evidence” feels real  

**Time box:** ~12–15 min core + 5 min Q&A  

---

## 1. Open with their language (1 min)

**Say:**  
“You mapped external risks — materials, transport, China, regulation, demand — and said they hit **suppliers**, then the **yard**. We built one model that does that chain: watch sources → interpret risk → show how it propagates → recommend what to do.”

**Do not:** start in connector config or architecture slides.

---

## 2. Portfolio — where is risk? (2 min)

**Open:** App `/` — Risk Overview  

**Click / show:**
- KPI strip (“overall”, critical objectives)
- Tile **Geopolitical & Regulatory** (opens case)
- Secondary: **Sources** on a tile, or nav **Configure sources**

**Say:**  
“This is the tilannehuone: every monitoring objective as a live risk signal. Worst first. One click drills in — not another siloed dashboard.”

---

## 3. Drill — what / why / how it spreads / what to do (6–7 min)

**Open:** App `/risk-cases/customs-trade-disruption` (or click Geopolitical tile)

### 3a. What is happening
**Show:** title + “now” narrative (China export licensing, tariffs, Asia–EU lanes)

**Say:**  
“Same topics as the sticky notes: KIINA, vientirajoitukset, kuljetukset, materiaalit.”

### 3b. Why — evidence (Indikaattorit)
**Click:** expand 1–2 risk factors  
**Show:** source tier **External** (Commission / customs) + observation line + confidence  

**Say:**  
“Not a gut feel — each driver is backed by a source observation. Indicators, not just categories.”

### 3c. How it spreads — the money shot
**Show:** relationship network lanes  

`Risk sources → Risk factors → Risk → Linked risks → Enterprise impact`

**Walk left → right:**  
export/tariff sources → licence & cost factors → **Customs & trade disruption** → material shortage / late delivery → schedule & cost at the yard  

**Say:**  
“This is the board arrow: *yllä olevat vaikuttavat toimittajiin* → *vaikuttavat telakkaan*. One risk, portfolio impact — not one hull in isolation.”

### 3d. What should we do
**Show:** P1 / P2 actions + expected effect chips + AI confidence line  

**Say:**  
“Decision support: prioritised mitigations with expected effect — early warning and avoided impact, not only a red score.”

---

## 4. Prove the platform is real (3 min)

**Switch to app** — Monitoring objectives → **Geopolitical & Regulatory**

**Show:**
- Sources **In use** (YLE / EUR-Lex), frequency configured  
- Optional: open source → sample / raw record (“this is what we collect”)  

**Say:**  
“The case UI is the intelligence layer. Underneath, risk managers already onboard sources with AI: propose connector → verify feed → approve sample → **In use**. Same monitoring objective connects collection to the risk story.”

**Optional 30s:** “Accept → sample” on a draft source if stable; otherwise stay on In use cards.

---

## 5. Close — why this model wins (1 min)

**Say:**  
1. **One object** — monitoring objective — from executive tile to sources to case.  
2. **External → supplier → yard** is first-class (network), not a slide.  
3. **Evidence-linked** drivers (indicators).  
4. **Actions** with expected effect.  
5. **Extensible:** Commodity (MEPS), Supplier insolvency, Customer demand are the same pattern — we don’t rebuild per risk type.

**Ask them:**  
“For the next iteration, which external risk should we wire end-to-end with live sources first — China/trade, MEPS/commodities, or supplier credit?”

---

## Backup paths (if asked)

| Question | Go to |
|----------|--------|
| Supplier bankruptcy / single-source | `risk-cases.html#c1` |
| Customer demand / yards | `risk-cases.html#c3` + Customer & Commercial MO |
| How is the score calculated? | `risk-calculation.html` (credibility, keep short) |
| Epidemic / terror / cruise safety | “In the model as extensible factors; not hero for this demo — shipbuilding cascade first.” |
| Can we add our own objective? | Six hardcoded MOs today; custom create is next iteration |

---

## Honesty rules (keep trust)

- Scores and € impacts in cases are **illustrative** until scoring backend exists.  
- Live proof today = **source onboarding + collection**; risk case = **target UX + mocked intelligence**.  
- Never claim Dun & Bradstreet / MEPS are connected if they aren’t — say “pattern shown; live path demonstrated with YLE/EUR-Lex.”

---

## One-line cue card

> App `/` Overview → Geopolitical case → open sources / configure → same model next.
