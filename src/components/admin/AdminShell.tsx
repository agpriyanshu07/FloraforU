import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "@/app/admin/actions";
import type { Session } from "@/lib/auth";
import AdminNav from "./AdminNav";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/homepage", label: "Homepage" },
  // The public gallery page is gone, but these items still feed the Instagram
  // strip on the homepage, so the link is named for the job it now does.
  { href: "/admin/gallery", label: "Instagram" },
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
              src="/img/brand/logo-ffu-mark.svg"
              alt=""
              width={41}
              height={36}
              className="h-9 w-auto"
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

        <AdminNav items={NAV} />
      </header>

      <main className="mx-auto w-full max-w-[1320px] px-4 py-8">{children}</main>
    </div>
  );
}
