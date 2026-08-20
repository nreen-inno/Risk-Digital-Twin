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
</style>
</head>
<body>
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
