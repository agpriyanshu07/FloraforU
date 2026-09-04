"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CloseIcon, MenuIcon, WhatsappIcon } from "./icons";

const NAV = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/categories", label: "Categories" },
  { href: "/offers", label: "Offers" },
  { href: "/gallery", label: "Gallery" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader({
  businessName,
  whatsappHref,
}: {
  businessName: string;
  whatsappHref: string;
}) {
  const pathname = usePathname();

  // The menu is "open for" a specific path. Navigating changes `pathname`, so
  // the menu closes on its own — no effect, and no menu left stuck open on back.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
      <div className="shell flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/img/brand/mark.svg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-full"
          />
          <span className="font-display text-xl leading-none">{businessName}</span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? "bg-rose-100 text-rose-700"
                      : "text-ink-600 hover:bg-rose-50 hover:text-rose-700"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp btn-sm hidden sm:inline-flex"
          >
            <WhatsappIcon className="h-4 w-4" />
            WhatsApp
          </a>

          <button
            type="button"
            onClick={() => setOpenFor(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="btn-ghost btn-sm !px-3 lg:hidden"
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      <nav
        id="mobile-nav"
        aria-label="Main (mobile)"
        hidden={!open}
        className="border-t border-line bg-cream lg:hidden"
      >
        <ul className="shell flex flex-col py-2">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex min-h-12 items-center rounded-lg px-3 text-[15px] font-medium ${
                  isActive(item.href) ? "bg-rose-100 text-rose-700" : "text-ink-900"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li className="px-3 py-2 sm:hidden">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp w-full"
            >
              <WhatsappIcon className="h-4 w-4" />
              Chat on WhatsApp
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
