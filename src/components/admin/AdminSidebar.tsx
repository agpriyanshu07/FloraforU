"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import { NavIcon } from "./icons";
import {
  BADGE_LABEL,
  NAV_GROUPS,
  currentSection,
  type AdminCounts,
} from "./nav-items";

/**
 * The desktop admin navigation.
 *
 * Replaces a wrapping row of nine identical pills above the content. That row
 * had three problems no amount of restyling fixes: nine equal-weight labels
 * give no clue which sections relate to each other, a horizontal row has no
 * space for anything but a word, and it moved as the content below it
 * reflowed, so the nav was never in the same place twice.
 *
 * A column fixes all three. Groups are visible, each item has room for a line
 * saying what it is for, sections needing attention can carry a count, and it
 * is in the same place on every screen. It is sticky and full-height, so the
 * nav does not scroll away on Products (5144px) or the homepage editor
 * (7168px) -- previously you scrolled to the top to change section.
 *
 * Below `lg` this is not rendered at all; AdminNav's pill row takes over,
 * which fits a phone and is already covered by the suite.
 */
export default function AdminSidebar({
  email,
  counts,
}: {
  email: string;
  counts: AdminCounts;
}) {
  const pathname = usePathname();
  const current = currentSection(pathname);

  return (
    <div className="hidden xl:flex xl:h-screen xl:flex-col xl:border-r xl:border-line xl:bg-surface">
      <Link
        href="/admin"
        className="flex shrink-0 items-center gap-2.5 border-b border-line px-5 py-4"
      >
        <Image
          src="/img/brand/logo-ffu-mark.svg"
          alt=""
          width={41}
          height={36}
          className="h-9 w-auto"
        />
        <span className="leading-tight">
          <span className="block font-display text-lg">FloralforU</span>
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-600">
            Admin
          </span>
        </span>
      </Link>

      {/* The nav itself scrolls if the viewport is short; the account block
          below stays put, so Sign out is always reachable. */}
      <nav aria-label="Admin sections" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.title ?? `ungrouped-${gi}`} className={gi > 0 ? "mt-5" : undefined}>
            {group.title && (
              <h2 className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-600">
                {group.title}
              </h2>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item === current;
                const badge = item.badge;
                const count = badge ? counts[badge] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 ${
                        active
                          ? "bg-rose-600 text-white"
                          : "text-ink-900 hover:bg-rose-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 shrink-0 ${
                          active ? "text-white" : "text-rose-600"
                        }`}
                      >
                        <NavIcon name={item.icon} />
                      </span>

                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span
                          className={`block truncate text-[12px] ${
                            active ? "text-rose-100" : "text-ink-600"
                          }`}
                        >
                          {item.blurb}
                        </span>
                      </span>

                      {badge && count > 0 && (
                        /* One atomic status, not a bare number: a reader
                           announcing "Enquiries, 3" leaves you to guess three
                           of what. The digit is the visible half of the same
                           sentence. */
                        <span
                          className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                            active
                              ? "bg-white text-rose-700"
                              : badge === "settings"
                                ? "bg-red-100 text-red-700"
                                : "bg-marigold-100 text-marigold-700"
                          }`}
                        >
                          <span aria-hidden="true">{count}</span>
                          <span className="sr-only">
                            {BADGE_LABEL[badge](count)}
                          </span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line px-3 py-3">
        <Link
          href="/"
          target="_blank"
          className="flex min-h-10 items-center justify-between rounded-xl px-3 text-sm font-medium text-ink-900 transition-colors duration-200 hover:bg-rose-50"
        >
          View the live site
          <span aria-hidden="true" className="text-ink-600">
            ↗
          </span>
        </Link>
        <p className="truncate px-3 pt-2 text-[12px] text-ink-600" title={email}>
          {email}
        </p>
        <form action={logoutAction} className="px-3 pt-1.5">
          <button type="submit" className="text-[13px] font-semibold text-rose-600 hover:text-rose-700">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
