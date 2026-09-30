"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BADGE_LABEL, NAV_ITEMS, currentSection, type AdminCounts } from "./nav-items";

/**
 * The admin section links on a phone and a tablet.
 *
 * Two things were wrong with the row this replaced. It was a single
 * `overflow-x-auto` line, so on a 390px phone it clipped after "Offers" and
 * the last five sections -- Reviews, Homepage, Instagram, Enquiries, Settings
 * -- could only be reached by a sideways drag with nothing on screen to
 * suggest one was possible. And nothing marked the current section, so there
 * was no answer to "where am I".
 *
 * It wraps now, which costs a second line and reaches everything, and the
 * current section is filled in. A section needing attention carries its count,
 * so Reviews waiting for approval are visible without opening Reviews -- the
 * same information the sidebar carries at `lg` and up, where this is replaced
 * by AdminSidebar.
 *
 * No icons here on purpose: a glyph plus a label makes each pill about 40%
 * wider, which pushed the row to four lines and 168px of a 390px screen
 * before any content. The sidebar has a column to spend on them; this does
 * not.
 */
export default function AdminNav({ counts }: { counts: AdminCounts }) {
  const pathname = usePathname();
  const current = currentSection(pathname);

  return (
    <nav aria-label="Admin sections" className="border-t border-line xl:hidden">
      <ul className="mx-auto flex w-full max-w-[1320px] flex-wrap gap-1 px-4 py-2">
        {NAV_ITEMS.map((item) => {
          const active = item === current;
          const badge = item.badge;
          const count = badge ? counts[badge] : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "bg-rose-600 text-white"
                    : "text-ink-600 hover:bg-rose-50 hover:text-rose-700"
                }`}
              >
                {item.label}
                {badge && count > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                      active
                        ? "bg-white text-rose-700"
                        : badge === "settings"
                          ? "bg-red-100 text-red-700"
                          : "bg-marigold-100 text-marigold-700"
                    }`}
                  >
                    <span aria-hidden="true">{count}</span>
                    <span className="sr-only">{BADGE_LABEL[badge](count)}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
