# Deploy the Risk Digital Twin demo to Azure Static Web Apps

## What you're deploying
One static file — **`demo/index.html`**. No backend, no API, no database, no keys.
It opens behind a light access screen (below).

## The access gate
- On open, a login screen appears. **Username is prefilled `demo-user`; password is `RDT-Meyer!`.**
- It stays unlocked for that browser tab (a new visit re-prompts).
- **This is a light client-side gate, not real security** — the check lives in the file, so a
  determined viewer can bypass it. It's fine here because the demo holds only illustrative
  data and no secrets. For real protection, use Azure SWA authentication (bottom).
- **To change username/password:** edit `frontend/build-demo.mjs`
  (`const GATE_USER = "demo-user"` and `Buffer.from("RDT-Meyer!")`), then rebuild:
  ```bash
  cd frontend
  npm install            # first time only
  npm run build:demo     # writes frontend/dist/risk-digital-twin-demo.html
  cp dist/risk-digital-twin-demo.html ../demo/index.html
  ```

## Option A — Azure SWA from this GitHub branch (recommended)
1. Azure Portal → **Create a resource → Static Web App** (Free plan is enough).
2. **Source:** GitHub → repo `nreen-inno/Risk-Digital-Twin`, branch **`standalone-demo`**.
3. **Build details:** Build Presets = **Custom**; **App location = `/demo`**;
   **Api location = *(leave blank)***; **Output location = *(leave blank)***.
   (The file is prebuilt, so there is no build step.)
4. Create. Azure adds a GitHub Action and publishes `demo/` at
   `https://<name>.azurestaticapps.net`.

> Do **not** add an API / Azure Functions resource — there is nothing for it to run.

## Option B — Direct upload (no GitHub wiring)
```bash
npm install -g @azure/static-web-apps-cli
swa deploy ./demo --env production --deployment-token <TOKEN>
```
Get `<TOKEN>` from the Static Web App resource → **Manage deployment token**.

## Routing note
The app uses hash routing (`#/...`), so deep links never hit the server and **no SPA
fallback is required**. The included `demo/staticwebapp.config.json` is optional (it just
sets a fallback and no-cache headers).

## Optional — replace the shared password with real login
Azure SWA has built-in authentication. Add route rules to `staticwebapp.config.json`
requiring authenticated users (Entra ID / GitHub), which forces a real sign-in before the
site loads. If you enable this, you can remove the in-app gate.

---

## Publish this update to GitHub (branch only — no merge)
This change adds the access gate + Azure files on top of what's already on `standalone-demo`.
From your repo root (`…/DigiTwin/Repo/RDT/`), with `standalone-demo-update.bundle` saved there:
```bash
git checkout standalone-demo
git fetch ./standalone-demo-update.bundle standalone-demo
git merge --ff-only FETCH_HEAD
git push origin standalone-demo
```
