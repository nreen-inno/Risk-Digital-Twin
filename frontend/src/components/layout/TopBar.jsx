import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo.jsx";

/** Premium application chrome — brand, section nav, environment status. */
export default function TopBar({ active = "overview" }) {
  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <div className="brand">
          <span className="brand__mark">
            <BrandLogo />
          </span>
          <span className="brand__text">
            <span className="brand__name">Risk Digital Twin</span>
            <span className="brand__sub">Enterprise Risk Intelligence</span>
          </span>
        </div>

        <nav className="topbar__nav" aria-label="Primary">
          <Link to="/" aria-current={active === "overview" ? "page" : undefined}>
            Risk overview
          </Link>
          <Link
            to="/configure/objectives"
            aria-current={active === "configure" ? "page" : undefined}
          >
            Configure sources
          </Link>
          <a href="#" aria-disabled="true">
            Intelligence
          </a>
          <a href="#" aria-disabled="true">
            Governance
          </a>
        </nav>

        <div className="topbar__right">
          <span className="status-dot">
            <i />
            Platform online
          </span>
          <span className="avatar" title="Signed in">
            RS
          </span>
        </div>
      </div>
    </header>
  );
}
