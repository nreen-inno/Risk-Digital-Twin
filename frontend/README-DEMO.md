# Risk Digital Twin — Standalone Client Demo

**File:** `Risk-Digital-Twin-DEMO.html` — one self-contained file. Double-click to open in a browser (Chrome or Edge recommended). No install, no server, no internet, **no Azure / no paid AI**.

## What it is
This is the **real RDT frontend** (the same React app from `RDT/frontend` — same screens, look and feel), rebuilt to run entirely on its own so a client can test it themselves:

- **Risk Overview** — executive KPIs + the six monitoring-objective cards (gauge, 6‑month trend, drivers) + identified-risks rail.
- **Risk Cases** — full case detail: what's happening / enterprise-impact tiles (hover = definition, click = calculation) / the 5‑lane propagation network / mitigations / AI insight.
- **Configure sources** — monitoring objectives, the **AI Source Advisor** (coverage + recommendations), and the complete **AI connector onboarding** flow (proposal → accept specification → connectivity sample / RawRecords → approve → In use).

## How it works (no backend, no paid AI)
- Every `/api/*` call the app makes is intercepted in the browser and served from the **bundled demo data** (the same `riskOverview`, `riskCases`, `monitoringCapabilities`, `demoMockSources` modules used by the backend demo).
- The AI screens (Source Advisor, Connector proposal) are served by **pre-baked, schema-correct responses** — deterministic and free. All figures are illustrative, as in the current demo.

## Optional: make the AI *live* but still free
The AI layer is swappable. Before the app loads (or from the console) set a provider and it will be used instead of the baked responses:

```js
window.RDT_AI_PROVIDER = async (kind, payload) => {
  // kind: "sourceAdvisor" | "connectorAdvisor"; payload: { objective } or { source, objective }
  // Call a FREE model here and return the same JSON shape the app expects:
  //   - Ollama (local, offline):  fetch("http://localhost:11434/api/generate", …)
  //   - Google Gemini / Groq free tier (needs internet + a key)
  // Return null to fall back to the baked response.
};
```
(Local models can be non-deterministic and may need prompting to match the strict JSON schema — the baked responses are the reliable default for a demo.)

## Notes
- Fonts: the app uses **Inter**; offline it falls back to the system UI font (cosmetic only).
- This build uses React 19 (the version available offline). A byte-exact React‑18 Vite build can be produced from the source kit (below) with `npm install && npm run build` on a machine that can reach npm.

## Rebuilding / maintaining (for your dev team)
The demo was produced from the repo with three added files, no other app changes:
- `src/demo/mockServer.js` — the in-browser API + baked AI.
- `src/demo/react-router-dom.jsx` — a tiny hash-router shim (so it runs from `file://`).
- `build.mjs` — an offline bundler (transpiles with TypeScript, inlines React, writes the single HTML).
- `src/main.jsx` — one added line: `installMockBackend()` before render.

Run `node build.mjs` → `dist/risk-digital-twin-demo.html`.
