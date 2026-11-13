"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/admin/actions";
import { NavIcon, type IconName } from "./icons";
import { BADGE_LABEL, NAV_ITEMS, currentSection, type AdminCounts } from "./nav-items";

/**
 * The admin on a phone: a bar along the bottom, like the apps the shop owner
 * already uses, with the four things done most and "More" for the rest.
 *
 * It replaces three rows of nine wrapping pills at the top of every page --
 * 130px of a 390px screen before any content, in an order that gave no clue
 * which sections mattered. The bottom of the screen is where a thumb is, it
 * stays put while a long list scrolls, and five targets fit without wrapping.
 *
 * "Add" goes to Add from PDF, the quickest way to put stock on the site. One
 * product at a time is a tap away inside it and on Products.
 */
const PRIMARY: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Home", icon: "dashboard" },
  { href: "/admin/products", label: "Products", icon: "products" },
  { href: "/admin/products/import-pdf", label: "Add", icon: "add" },
  { href: "/admin/offers", label: "Offers", icon: "offers" },
];

const ACTIVE_MATCH = [...PRIMARY.map((p) => ({ ...p, blurb: "" })), ...NAV_ITEMS.filter((i) => i.href !== "/admin" && i.href !== "/admin/products" && i.href !== "/admin/offers")];

export default function AdminTabBar({ counts }: { counts: AdminCounts }) {
  const pathname = usePathname();
  // The sheet belongs to the page it was opened on, so navigating away closes
  // it without an effect resetting state.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((prev) => {
      const was = prev === pathname;
      return (typeof next === "function" ? next(was) : next) ? pathname : null;
    });
  const current = currentSection(pathname, ACTIVE_MATCH);

  // Escape closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const rest = NAV_ITEMS.filter((i) => !PRIMARY.some((p) => p.href === i.href));
  const restCount = rest.reduce((n, i) => n + (i.badge ? counts[i.badge] : 0), 0);
  const moreActive = !!current && rest.some((r) => r.href === current.href);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-ink-900/40 xl:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      {/* Rendered only while open, so a closed menu is not a second dialog on
          every admin page. */}
      {open && (
      <div
        id="admin-more"
        role="dialog"
        aria-modal="true"
        aria-label="More admin sections"
        className="fixed inset-x-0 bottom-16 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-3 shadow-2xl xl:hidden"
      >
        <ul className="grid grid-cols-2 gap-2">
          {rest.map((item) => {
            const count = item.badge ? counts[item.badge] : 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current?.href === item.href ? "page" : undefined}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-line px-3 text-sm font-medium hover:bg-rose-50 aria-[current=page]:border-rose-600 aria-[current=page]:bg-rose-50"
                >
                  <span className="text-rose-600"><NavIcon name={item.icon} /></span>
                  <span className="min-w-0 flex-1 leading-tight">
                    {item.label}
                    <span className="block truncate text-[11px] font-normal text-ink-600">{item.blurb}</span>
                  </span>
                  {item.badge && count > 0 && (
                    <span className="rounded-full bg-marigold-100 px-1.5 text-[11px] font-bold text-marigold-700">
                      <span aria-hidden="true">{count}</span>
                      <span className="sr-only">{BADGE_LABEL[item.badge](count)}</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <Link href="/" target="_blank" className="btn-ghost btn-sm">View the live site ↗</Link>
          <form action={logoutAction}>
            <button type="submit" className="btn-ghost btn-sm">Sign out</button>
          </form>
        </div>
      </div>
      )}

      <nav
        aria-label="Admin menu"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
          {PRIMARY.map((item) => {
            const active = current?.href === item.href;
            const isAdd = item.icon === "add";
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    isAdd ? "text-rose-700" : active ? "text-rose-700" : "text-ink-600"
                  }`}
                >
                  <span
                    className={
                      isAdd
                        ? "grid h-9 w-9 place-items-center rounded-full bg-rose-600 text-white"
                        : active
                          ? "grid h-7 w-12 place-items-center rounded-full bg-rose-100"
                          : "grid h-7 w-12 place-items-center"
                    }
                  >
                    <NavIcon name={item.icon} />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={open ? "admin-more" : undefined}
              onClick={() => setOpen((o) => !o)}
              className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                open || moreActive ? "text-rose-700" : "text-ink-600"
              }`}
            >
              <span className={`grid h-7 w-12 place-items-center rounded-full ${open || moreActive ? "bg-rose-100" : ""}`}>
                <NavIcon name="more" />
              </span>
              More
              {restCount > 0 && (
                <span className="absolute right-3 top-1.5 rounded-full bg-marigold-600 px-1.5 text-[10px] font-bold text-white">
                  <span aria-hidden="true">{restCount}</span>
                  <span className="sr-only">, {restCount} need attention</span>
                </span>
              )}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
