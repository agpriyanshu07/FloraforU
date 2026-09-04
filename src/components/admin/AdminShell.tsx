import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "@/app/admin/actions";
import type { Session } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/homepage", label: "Homepage" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src="/img/brand/mark.svg"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full"
            />
            <span className="font-display text-lg">Admin</span>
          </Link>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" target="_blank" className="text-ink-600 hover:text-rose-700">
              View site ↗
            </Link>
            <span className="hidden text-ink-600 sm:inline">{session.email}</span>
            <form action={logoutAction}>
              <button type="submit" className="btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <nav aria-label="Admin sections" className="border-t border-line">
          <ul className="mx-auto flex w-full max-w-[1320px] gap-1 overflow-x-auto px-4 py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium text-ink-600 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1320px] px-4 py-8">{children}</main>
    </div>
  );
}
