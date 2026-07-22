import { BrandMark } from "../../lib/icons.jsx";

/** Premium application chrome — brand, section nav, environment status. */
export default function TopBar() {
  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <div className="brand">
          <span className="brand__mark">
            <BrandMark />
          </span>
          <span>
            <span className="brand__name">Risk Digital Twin</span>
            <span className="brand__sub">Enterprise Risk Intelligence</span>
          </span>
        </div>

        <nav className="topbar__nav" aria-label="Primary">
          <a href="#" aria-current="true">Configure</a>
          <a href="#">Sources</a>
          <a href="#">Intelligence</a>
          <a href="#">Governance</a>
        </nav>

        <div className="topbar__right">
          <span className="status-dot">
            <i />
            Platform online
          </span>
          <span className="avatar" title="Signed in">RS</span>
        </div>
      </div>
    </header>
  );
}
