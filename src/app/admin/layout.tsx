import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();

  // Middleware already redirects unauthenticated requests; without a session
  // here we must be on /admin/login, which renders standalone.
  if (!session) return <>{children}</>;

  return <AdminShell session={session}>{children}</AdminShell>;
}
