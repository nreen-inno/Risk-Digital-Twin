// Offline single-file bundler for the RDT demo.
// No npm, no network: transpiles the app with the globally-installed TypeScript
// compiler, inlines React/react-dom (global) + a react-router shim, collects CSS,
// and writes one self-contained HTML file that runs from file://.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import url from "url";

const require = createRequire(import.meta.url);
const ROOT = path.dirname(url.fileURLToPath(import.meta.url)); // the frontend/ dir
const SRC = path.join(ROOT, "src");
const ENTRY = path.join(SRC, "main.jsx");
const ROUTER_SHIM = path.join(SRC, "demo", "react-router-dom.jsx");

// Resolve deps from the project's own node_modules first (works after `npm install`
// on any machine), falling back to a global install if present. No network needed.
const GLOBAL = "/home/claude/.npm-global/lib/node_modules";
const localReq = createRequire(path.join(ROOT, "_localanchor.js"));
const globalReq = fs.existsSync(GLOBAL)
  ? createRequire(path.join(GLOBAL, "_anchor.js"))
  : null;

function resolveDep(spec, fromFile) {
  const tryers = [
    () => createRequire(fromFile).resolve(spec),
    () => localReq.resolve(spec),
    () => (globalReq ? globalReq.resolve(spec) : null),
  ];
  for (const t of tryers) {
    try {
      const r = t();
      if (r) return r;
    } catch {
      /* next */
    }
  }
  throw new Error(`Cannot resolve dependency "${spec}" (install it via npm, or run where a global copy exists)`);
}

let ts;
try {
  ts = localReq("typescript");
} catch {
  ts = globalReq ? globalReq("typescript") : null;
}
if (!ts) throw new Error("TypeScript not found. Add it: npm i -D typescript");

const EXTS = [".jsx", ".js", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".css"];

function tryFile(p) {
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  for (const e of EXTS) if (fs.existsSync(p + e)) return p + e;
  for (const e of EXTS) {
    const idx = path.join(p, "index" + e);
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

function resolve(spec, fromFile) {
  if (spec === "react-router-dom") return ROUTER_SHIM;
  if (spec.startsWith(".") || spec.startsWith("/")) {
    const base = path.resolve(path.dirname(fromFile), spec);
    const f = tryFile(base);
    if (!f) throw new Error(`Cannot resolve "${spec}" from ${fromFile}`);
    return f;
  }
  // bare specifier (react, react-dom, react-dom/client, scheduler, …)
  return resolveDep(spec, fromFile);
}

const modules = new Map(); // abs -> { id, code, deps: {spec: abs}, kind }
let nextId = 0;
const cssFiles = []; // {abs, css}
const cssSeen = new Set();

function scanRequires(code) {
  const specs = [];
  const rx = /\brequire\(\s*(['"])(.*?)\1\s*\)/g;
  let m;
  while ((m = rx.exec(code))) specs.push(m[2]);
  return specs;
}

function loadModule(abs) {
  if (modules.has(abs)) return modules.get(abs);
  const ext = path.extname(abs).toLowerCase();
  const record = { id: nextId++, code: "", deps: {}, kind: "js" };
  modules.set(abs, record);

  if (ext === ".css") {
    if (!cssSeen.has(abs)) {
      cssSeen.add(abs);
      cssFiles.push({ abs, css: fs.readFileSync(abs, "utf8") });
    }
    record.kind = "css";
    record.code = "module.exports = {};";
    return record;
  }
  if (ext === ".json") {
    record.kind = "json";
    record.code = "module.exports = " + fs.readFileSync(abs, "utf8") + ";";
    return record;
  }

  let source = fs.readFileSync(abs, "utf8");
  const isApp = abs.startsWith(SRC);

  if (isApp) {
    // Neutralise Vite-only import.meta.env for the plain-script bundle.
    source = source.replace(/import\.meta\.env/g, "globalThis.__RDT_ENV__");
    const out = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        allowJs: true,
        importHelpers: false,
        sourceMap: false,
      },
      fileName: abs,
    });
    record.code = out.outputText;
  } else {
    // node_modules (React etc.) — already CommonJS, include verbatim.
    record.code = source;
  }

  for (const spec of scanRequires(record.code)) {
    if (record.deps[spec] !== undefined) continue;
    let target;
    try {
      target = resolve(spec, abs);
    } catch (e) {
      // Unresolved bare require inside a dep we don't ship — stub it.
      console.warn("  ! stubbing unresolved require:", spec, "from", path.relative(ROOT, abs));
      const stubAbs = "STUB:" + spec;
      if (!modules.has(stubAbs)) {
        const stub = { id: nextId++, code: "module.exports = {};", deps: {}, kind: "stub" };
        modules.set(stubAbs, stub);
      }
      record.deps[spec] = stubAbs;
      continue;
    }
    record.deps[spec] = target;
    loadModule(target);
  }
  return record;
}

console.log("Bundling from", path.relative(ROOT, ENTRY));
const entry = loadModule(ENTRY);

// Build id maps
const byAbs = new Map();
for (const [abs, rec] of modules) byAbs.set(abs, rec.id);

let modsSrc = "";
let mapSrc = "";
for (const [abs, rec] of modules) {
  modsSrc += `${rec.id}: function(module, exports, require){\n${rec.code}\n},\n`;
  const map = {};
  for (const [spec, target] of Object.entries(rec.deps)) map[spec] = byAbs.get(target);
  mapSrc += `${rec.id}: ${JSON.stringify(map)},\n`;
}

const bundle = `(function(){
"use strict";
window.process = window.process || { env: { NODE_ENV: "production" } };
globalThis.__RDT_ENV__ = { VITE_API_BASE_URL: "" };
var __modules = {\n${modsSrc}};
var __map = {\n${mapSrc}};
var __cache = {};
function __require(id){
  if (__cache[id]) return __cache[id].exports;
  var module = __cache[id] = { exports: {} };
  __modules[id](module, module.exports, function(spec){
    var t = __map[id] ? __map[id][spec] : undefined;
    if (t === undefined || t === null) throw new Error("Cannot find module '"+spec+"'");
    return __require(t);
  });
  return module.exports;
}
try { __require(${entry.id}); }
catch (e) { console.error("RDT bundle error:", e); var r=document.getElementById("root"); if(r) r.innerHTML='<pre style="padding:24px;color:#b00">'+(e&&e.stack||e)+'</pre>'; }
})();`;

// CSS: base design tokens first, then the rest in discovery order.
cssFiles.sort((a, b) => {
  const rank = (p) =>
    p.endsWith("design-system.css") ? 0 : p.endsWith("index.css") ? 1 : 2;
  return rank(a.abs) - rank(b.abs);
});
const css = cssFiles.map((c) => `/* ${path.relative(SRC, c.abs)} */\n` + c.css).join("\n\n");

// ---- Demo access gate (light shared-password screen; NOT real security) ----
const logoB64 = fs.readFileSync(path.join(SRC, "demo", "rdt-logo.b64"), "utf8").trim();
const GATE_USER = "demo-user";
const GATE_PW_B64 = Buffer.from("RDT-Meyer!").toString("base64");
const gateCss = `
/* demo access gate */
#rdt-gate{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;
  background:radial-gradient(1100px 560px at 18% -12%, rgba(36,216,192,.16), transparent 60%),
             radial-gradient(900px 520px at 100% 0%, rgba(14,110,102,.35), transparent 58%),
             linear-gradient(135deg,#052320 0%, #0A4F49 58%, #07302B 100%);
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;}
#rdt-gate .card{width:372px;max-width:92vw;background:#fff;border-radius:16px;padding:32px 30px 24px;
  box-shadow:0 30px 80px rgba(5,35,32,.55);text-align:center;}
#rdt-gate .logo{width:78px;height:78px;margin:0 auto 14px;display:block}
#rdt-gate h1{margin:0;font-size:19px;font-weight:800;color:#0A4F49;letter-spacing:.01em}
#rdt-gate .sub{margin:5px 0 22px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#0E6E66}
#rdt-gate label{display:block;text-align:left;font-size:10.5px;font-weight:700;color:#566B67;text-transform:uppercase;letter-spacing:.06em;margin:0 0 5px}
#rdt-gate input{width:100%;box-sizing:border-box;height:42px;border:1px solid #CBDCD6;border-radius:9px;padding:0 12px;
  font-size:14px;color:#123833;outline:none;margin-bottom:14px;background:#F8FBFA;font-family:inherit}
#rdt-gate input:focus{border-color:#0E6E66;background:#fff;box-shadow:0 0 0 3px rgba(14,110,102,.12)}
#rdt-gate .err{color:#D32F2F;font-size:12px;font-weight:600;min-height:16px;margin:-6px 0 8px;text-align:left}
#rdt-gate button{width:100%;height:44px;border:none;border-radius:9px;cursor:pointer;color:#fff;font-size:14px;font-weight:700;
  letter-spacing:.02em;font-family:inherit;background:linear-gradient(135deg,#0E6E66,#0A4F49)}
#rdt-gate button:hover{filter:brightness(1.07)}
#rdt-gate .foot{margin-top:16px;font-size:10.5px;color:#9CA8B4;line-height:1.5}
#rdt-gate.hide{opacity:0;pointer-events:none;transition:opacity .4s ease}
@keyframes rdtshake{10%,90%{transform:translateX(-2px)}30%,70%{transform:translateX(4px)}50%{transform:translateX(-7px)}}
#rdt-gate .card.shake{animation:rdtshake .4s}
`;
const gateBody = `<div id="rdt-gate">
  <form class="card" id="rdt-gate-form" autocomplete="off" spellcheck="false">
    <img class="logo" src="data:image/png;base64,${logoB64}" alt="Risk Digital Twin" />
    <h1>Risk Digital Twin</h1>
    <div class="sub">Demo access</div>
    <label for="rdt-u">Username</label>
    <input id="rdt-u" type="text" value="${GATE_USER}" autocomplete="off" />
    <label for="rdt-p">Password</label>
    <input id="rdt-p" type="password" placeholder="Enter password" autocomplete="off" />
    <div class="err" id="rdt-err"></div>
    <button type="submit">Open demo</button>
    <div class="foot">Authorised preview &middot; illustrative data</div>
  </form>
</div>
<script>
(function(){
  var U=${JSON.stringify(GATE_USER)}, P=atob(${JSON.stringify(GATE_PW_B64)}), KEY="rdt.demo.unlocked";
  try{ if(sessionStorage.getItem(KEY)==="1"){ var g0=document.getElementById("rdt-gate"); if(g0&&g0.parentNode) g0.parentNode.removeChild(g0); return; } }catch(e){}
  function ready(fn){ if(document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded",fn); }
  ready(function(){
    var gate=document.getElementById("rdt-gate"); if(!gate) return;
    var form=document.getElementById("rdt-gate-form"), err=document.getElementById("rdt-err"), pw=document.getElementById("rdt-p");
    setTimeout(function(){ if(pw) pw.focus(); },60);
    form.addEventListener("submit",function(e){
      e.preventDefault();
      var u=(document.getElementById("rdt-u").value||"").trim(), p=document.getElementById("rdt-p").value||"";
      if(u===U && p===P){
        try{ sessionStorage.setItem(KEY,"1"); }catch(e){}
        gate.classList.add("hide");
        setTimeout(function(){ if(gate.parentNode) gate.parentNode.removeChild(gate); },420);
      } else {
        err.textContent="Incorrect username or password.";
        form.classList.add("shake"); setTimeout(function(){ form.classList.remove("shake"); },420);
        pw.value=""; pw.focus();
      }
    });
  });
})();
</script>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="Risk Digital Twin — offline demo (no backend, no paid AI)" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<title>Risk Digital Twin — Demo</title>
<style>
${css}
${gateCss}
</style>
</head>
<body>
${gateBody}
<div id="root"></div>
<script>
${bundle}
</script>
</body>
</html>`;

const outDir = path.join(ROOT, "dist");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "risk-digital-twin-demo.html");
fs.writeFileSync(outFile, html);
console.log(
  `Wrote ${path.relative(ROOT, outFile)} — ${modules.size} modules, ${cssFiles.length} css files, ${(html.length / 1024).toFixed(0)} KB`
);
