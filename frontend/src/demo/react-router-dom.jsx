// Minimal react-router-dom shim for the offline demo build.
// Implements exactly the subset the RDT app uses: BrowserRouter/HashRouter,
// Routes, Route, Navigate, Link, useNavigate, useParams, useLocation.
// Uses hash-based routing so the built file works from file:// (double-click).
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

const RouterCtx = createContext(null);
const RouteCtx = createContext({ params: {} });

let _pendingState;

function currentPath() {
  const h = window.location.hash || "";
  let p = h.startsWith("#") ? h.slice(1) : h;
  if (!p) p = "/";
  if (!p.startsWith("/")) p = "/" + p;
  return p;
}

export function HashRouter({ children }) {
  const [path, setPath] = useState(currentPath());
  const [state, setState] = useState(_pendingState);

  useEffect(() => {
    const onHash = () => {
      setPath(currentPath());
      setState(_pendingState);
    };
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) window.location.hash = "#/";
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((to, opts = {}) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    let target =
      typeof to === "string" ? to : (to.pathname || "/") + (to.search || "");
    if (!target.startsWith("/")) target = "/" + target;
    _pendingState = opts.state;
    const full = "#" + target;
    if (opts.replace) {
      const base = window.location.href.split("#")[0];
      window.location.replace(base + full);
      setPath(currentPath());
      setState(_pendingState);
    } else {
      window.location.hash = full;
    }
  }, []);

  const location = useMemo(() => {
    const qi = path.indexOf("?");
    const pathname = qi >= 0 ? path.slice(0, qi) : path;
    const search = qi >= 0 ? path.slice(qi) : "";
    return { pathname, search, hash: "", state };
  }, [path, state]);

  const value = useMemo(() => ({ location, navigate }), [location, navigate]);
  return React.createElement(RouterCtx.Provider, { value }, children);
}

export const BrowserRouter = HashRouter;
export const MemoryRouter = HashRouter;

export function useNavigate() {
  return useContext(RouterCtx).navigate;
}
export function useLocation() {
  return useContext(RouterCtx).location;
}
export function useParams() {
  return useContext(RouteCtx).params;
}

function matchPath(pattern, pathname) {
  if (pattern === "*") return { params: {} };
  const keys = [];
  const norm = (s) => (s.replace(/\/+$/, "") || "/");
  const body = pattern
    .replace(/\/+$/, "")
    .replace(/:[^/]+/g, (m) => {
      keys.push(m.slice(1));
      return "([^/]+)";
    })
    .replace(/\*/g, ".*");
  const rx = new RegExp("^" + (body || "/") + "/?$");
  const m = norm(pathname).match(rx);
  if (!m) return null;
  const params = {};
  keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
  return { params };
}

export function Routes({ children }) {
  const { location } = useContext(RouterCtx);
  const routes = React.Children.toArray(children).filter(Boolean);
  for (const r of routes) {
    const { path, element } = r.props || {};
    if (path == null) continue;
    const match = matchPath(path, location.pathname);
    if (match) {
      return React.createElement(
        RouteCtx.Provider,
        { value: { params: match.params } },
        element
      );
    }
  }
  return null;
}

export function Route() {
  return null; // configuration-only, consumed by <Routes>
}

export function Navigate({ to, replace }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: !!replace });
  }, []);
  return null;
}

export function Link({ to, children, state, className, style, title, onClick, ...rest }) {
  const navigate = useNavigate();
  const target = typeof to === "string" ? to : (to && to.pathname) || "/";
  const href = "#" + (target.startsWith("/") ? target : "/" + target);
  const handle = (e) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to, { state });
  };
  return React.createElement(
    "a",
    { href, onClick: handle, className, style, title, ...rest },
    children
  );
}
export const NavLink = Link;

export default {
  BrowserRouter,
  HashRouter,
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  Link,
  NavLink,
  useNavigate,
  useParams,
  useLocation,
};
