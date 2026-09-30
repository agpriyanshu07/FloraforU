import type { IconName } from "./icons";

/**
 * The admin sections, grouped by what the shop owner came to do.
 *
 * The flat list this replaces put Products, Homepage, Enquiries and Settings
 * side by side as nine identical pills, which says they are nine equivalent
 * things. They are not: three of them change what is in the catalogue, three
 * change how the site looks, one is the inbox, and one is configuration you
 * touch once. Grouping is the whole point -- it is what makes a section
 * findable without reading all nine labels.
 */

export type AdminSection = {
  href: string;
  label: string;
  icon: IconName;
  /** Which count in AdminCounts to badge this section with, if any. */
  badge?: "enquiries" | "reviews" | "settings";
  /** Shown under the label in the sidebar. Says what the section is for. */
  blurb: string;
};

export type AdminGroup = { title: string | null; items: AdminSection[] };

export const NAV_GROUPS: AdminGroup[] = [
  {
    title: null,
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: "dashboard",
        blurb: "What needs doing",
      },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: "products", blurb: "Add, edit, photos" },
      { href: "/admin/categories", label: "Categories", icon: "categories", blurb: "Names, covers, order" },
      { href: "/admin/offers", label: "Offers", icon: "offers", blurb: "Time-bound sales" },
    ],
  },
  {
    title: "The website",
    items: [
      { href: "/admin/homepage", label: "Homepage", icon: "homepage", blurb: "Hero, pinned, numbers" },
      // The public gallery page is gone, but these items still feed the
      // Instagram strip on the homepage, so the link is named for the job it
      // now does rather than for the table behind it.
      { href: "/admin/gallery", label: "Instagram", icon: "instagram", blurb: "The homepage strip" },
      { href: "/admin/reviews", label: "Reviews", icon: "reviews", blurb: "Approve and publish", badge: "reviews" },
    ],
  },
  {
    title: "Customers",
    items: [
      {
        href: "/admin/enquiries",
        label: "Enquiries",
        icon: "enquiries",
        blurb: "Who got in touch",
        badge: "enquiries",
      },
    ],
  },
  {
    title: null,
    items: [
      {
        href: "/admin/settings",
        label: "Settings",
        icon: "settings",
        blurb: "Contact details, SEO",
        badge: "settings",
      },
    ],
  },
];

export const NAV_ITEMS: AdminSection[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * The numbers worth interrupting for. Each one is a thing the owner has to do
 * something about -- not a total. A count of products is interesting; a count
 * of reviews waiting on a decision is a job.
 */
export type AdminCounts = {
  enquiries: number;
  reviews: number;
  settings: number;
};

/** What the badge means, spelled out for a screen reader. */
export const BADGE_LABEL: Record<keyof AdminCounts, (n: number) => string> = {
  enquiries: (n) => `${n} to follow up`,
  reviews: (n) => `${n} waiting for approval`,
  settings: (n) => `${n} still set to a placeholder`,
};

/**
 * Longest match wins, so /admin/products/import marks Products rather than
 * also matching the Dashboard's "/admin".
 */
export function currentSection(pathname: string, items: AdminSection[] = NAV_ITEMS) {
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
