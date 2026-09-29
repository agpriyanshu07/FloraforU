"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

/**
 * The admin section links.
 *
 * Two things were wrong with the row this replaces. It was a single
 * `overflow-x-auto` line, so on a 390px phone it clipped after "Offers" and
 * the last five sections -- Reviews, Homepage, Instagram, Enquiries, Settings
 * -- could only be reached by a sideways drag with nothing on screen to
 * suggest one was possible. And nothing marked the current section, so there
 * was no answer to "where am I".
 *
 * It wraps now, which costs a second line on a phone and reaches everything,
 * and the current section is filled in.
 */
export default function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Longest match wins, so /admin/products/import marks Products rather than
  // also matching the Dashboard's "/admin".
  const current = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav aria-label="Admin sections" className="border-t border-line">
      <ul className="mx-auto flex w-full max-w-[1320px] flex-wrap gap-1 px-4 py-2">
        {items.map((item) => {
          const active = item === current;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "bg-rose-600 text-white"
                    : "text-ink-600 hover:bg-rose-50 hover:text-rose-700"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
