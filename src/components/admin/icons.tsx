/**
 * The admin section icons.
 *
 * Hand-drawn rather than pulled from a library: the admin loads nine of these
 * on every page, and an icon font or component package would be the single
 * largest thing in the bundle for nine 24px glyphs. They share one grid and
 * one stroke weight so the sidebar reads as one set.
 *
 * Every glyph sits beside its own visible text label, so it is decorative in
 * the accessibility sense and is hidden from screen readers — a reader that
 * announced "graph, Dashboard" would be repeating itself. Nothing here is
 * ever the only label on a control.
 */

const BASE = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

export type IconName =
  | "dashboard"
  | "products"
  | "categories"
  | "offers"
  | "homepage"
  | "instagram"
  | "reviews"
  | "enquiries"
  | "settings";

function Dashboard() {
  return (
    <svg {...BASE}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5" />
      <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

/* A bouquet — the thing this shop actually sells, and the one glyph worth
   drawing literally rather than as a generic box. */
function Products() {
  return (
    <svg {...BASE}>
      <path d="M12 12.5V21" />
      <path d="M12 12.5c0-2.5 1.8-4.5 4-4.5 0 2.5-1.8 4.5-4 4.5Z" />
      <path d="M12 12.5C12 10 10.2 8 8 8c0 2.5 1.8 4.5 4 4.5Z" />
      <path d="M12 8.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z" />
      <path d="M8.5 21h7" />
    </svg>
  );
}

function Categories() {
  return (
    <svg {...BASE}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3l2 2.5h8A2.5 2.5 0 0 1 21 10v6.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
    </svg>
  );
}

function Offers() {
  return (
    <svg {...BASE}>
      <path d="M20.2 12.8 12.8 20.2a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1-.6-1.6l.5-6a2 2 0 0 1 1.8-1.8l6-.5a2 2 0 0 1 1.6.6l6.2 6.2a2 2 0 0 1 0 2.8Z" />
      <path d="M8.5 8.5h.01" />
      <path d="m10.5 15 4.5-4.5" />
    </svg>
  );
}

function Homepage() {
  return (
    <svg {...BASE}>
      <path d="m3 10.5 9-7.5 9 7.5" />
      <path d="M5.5 9v10.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9" />
      <path d="M9.75 21v-6h4.5v6" />
    </svg>
  );
}

function Instagram() {
  return (
    <svg {...BASE}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M16.9 7.1h.01" />
    </svg>
  );
}

function Reviews() {
  return (
    <svg {...BASE}>
      <path d="m12 3.5 2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85L12 3.5Z" />
    </svg>
  );
}

function Enquiries() {
  return (
    <svg {...BASE}>
      <path d="M20.5 12c0 4.14-3.8 7.5-8.5 7.5a9.7 9.7 0 0 1-2.6-.35L4.5 20.5l1.2-3.4A7.06 7.06 0 0 1 3.5 12C3.5 7.86 7.3 4.5 12 4.5s8.5 3.36 8.5 7.5Z" />
      <path d="M8.75 11.5h.01" />
      <path d="M12 11.5h.01" />
      <path d="M15.25 11.5h.01" />
    </svg>
  );
}

function Settings() {
  return (
    <svg {...BASE}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

const ICONS: Record<IconName, () => React.ReactElement> = {
  dashboard: Dashboard,
  products: Products,
  categories: Categories,
  offers: Offers,
  homepage: Homepage,
  instagram: Instagram,
  reviews: Reviews,
  enquiries: Enquiries,
  settings: Settings,
};

export function NavIcon({ name }: { name: IconName }) {
  const Glyph = ICONS[name];
  return <Glyph />;
}
