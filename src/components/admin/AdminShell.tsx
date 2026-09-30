import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "@/app/admin/actions";
import type { Session } from "@/lib/auth";
import { getAdminCounts } from "@/lib/admin-counts";
import AdminNav from "./AdminNav";
import AdminSidebar from "./AdminSidebar";

/**
 * The frame every admin page sits in.
 *
 * Two layouts, one breakpoint. At `lg` and up it is a two-column grid with a
 * sticky sidebar (AdminSidebar) and no top bar at all -- the brand, the
 * account and "View the live site" all live in the sidebar's own header and
 * footer, so the content starts at the top of the window instead of below
 * 104px of chrome that repeated on every page.
 *
 * Below `lg` the sidebar is not rendered and the old header returns: a brand
 * bar plus AdminNav's wrapping pill row, which is what fits a 390px screen.
 *
 * `minmax(0,1fr)` on the content column is not optional. A grid item will not
 * shrink below its content by default, so a wide table inside it widens the
 * column instead of scrolling -- the same bug that put 48px of sideways
 * scroll on /admin/offers and 37px on the category list.
 */
export default async function AdminShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const counts = await getAdminCounts();

  return (
    <div className="min-h-screen bg-cream xl:grid xl:grid-cols-[17rem_minmax(0,1fr)] xl:items-start">
      {/* Sticky rather than fixed, so it participates in the grid and cannot
          overlap the content column. */}
      <div className="xl:sticky xl:top-0">
        <AdminSidebar email={session.email} counts={counts} />
      </div>

      <div className="min-w-0">
        <header className="border-b border-line bg-surface xl:hidden">
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

          <AdminNav counts={counts} />
        </header>

        <main className="@container mx-auto w-full max-w-[1280px] px-4 py-8 xl:px-8">{children}</main>
      </div>
    </div>
  );
}
