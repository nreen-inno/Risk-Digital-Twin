// Professional line-icon set (inline SVG, 1.6 stroke). No emoji, no icon font.
// Each icon inherits `currentColor` so the design system controls tone.

const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function GeopoliticalIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
      <path d="M5 8.5c4.5 2 9.5 2 14 0M5 15.5c4.5-2 9.5-2 14 0" />
    </svg>
  );
}

export function SupplierIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 16V9l6-3 6 3M3 16l6 3 6-3M3 16V9" />
      <path d="M15 9l6-2.5V14l-6 3V9z" />
      <path d="M9 6v10" />
    </svg>
  );
}

export function WeatherIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 16a4 4 0 010-8 5 5 0 019.6-1.3A3.8 3.8 0 0117 16H7z" />
      <path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2" />
    </svg>
  );
}

export function CommodityIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19h16" />
      <path d="M5 15l4-4 3 3 6-7" />
      <path d="M18 7h2.5V9.5" />
    </svg>
  );
}

export function GenericIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7 4v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7l7-4z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  );
}

const MAP = {
  geopolitical: GeopoliticalIcon,
  supplier: SupplierIcon,
  weather: WeatherIcon,
  commodity: CommodityIcon,
  generic: GenericIcon,
};

export function ObjectiveIcon({ iconKey, ...props }) {
  const Cmp = MAP[iconKey] || GenericIcon;
  return <Cmp {...props} />;
}

// --- Standalone UI glyphs ---

export function BrandMark(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3l7.5 4.2v6.1c0 4.2-3.1 6.9-7.5 8.4-4.4-1.5-7.5-4.2-7.5-8.4V7.2L12 3z"
        stroke="#bcd0f2"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.4" fill="#7ea6ff" />
      <path d="M12 3v5.6M12 13.4V21M6 8l3.9 1.8M18 8l-3.9 1.8" stroke="#7ea6ff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ArrowIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12l4 4L19 6" />
    </svg>
  );
}

export function SparkIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3l1.8 4.9L18.7 9l-4.9 1.8L12 15l-1.8-4.2L5.3 9l4.9-1.1L12 3z" />
      <path d="M18 15l.7 1.9L20.6 18l-1.9.6L18 20l-.6-1.4L15.7 18l1.7-.6L18 15z" />
    </svg>
  );
}

export function OfflineIcon(props) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3l18 18" />
      <path d="M8.5 8.6A6 6 0 003 12M12 5c2.5 0 4.8 1 6.5 2.6M16.7 12.4c.6.4 1.1.9 1.6 1.5M6.5 12.5A4 4 0 006 13M9 15.6A2 2 0 0112 15" />
      <path d="M12 19h.01" />
    </svg>
  );
}

export function InboxIcon(props) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 13l2.5-7h11L20 13v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5z" />
      <path d="M4 13h4l1.5 2.5h5L16 13h4" />
    </svg>
  );
}
