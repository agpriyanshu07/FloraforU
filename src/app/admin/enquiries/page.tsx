import Link from "next/link";
import { PageHeader, TableShell, EmptyRow, Banner, StatTile } from "@/components/admin/ui";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteEnquiryAction, toggleEnquiryHandledAction } from "@/lib/admin-actions";
import { db } from "@/lib/db";
import { daysAgo } from "@/lib/format";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const PER_PAGE = 40;

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp click",
  call: "Call click",
  instagram: "Instagram click",
  form: "Contact form",
};

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const channel = sp.channel ?? "";
  const onlyOpen = sp.open === "1";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const where: Prisma.EnquiryWhereInput = {};
  if (channel) where.channel = channel;
  if (onlyOpen) where.handled = false;

  const weekAgo = daysAgo(7);

  const [enquiries, total, thisWeek, formCount, unhandled] = await Promise.all([
    db.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { product: { select: { name: true, slug: true } } },
    }),
    db.enquiry.count({ where }),
    db.enquiry.count({ where: { createdAt: { gte: weekAgo } } }),
    db.enquiry.count({ where: { channel: "form" } }),
    db.enquiry.count({ where: { handled: false } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Every WhatsApp click, call click and contact-form message is logged here — so nothing gets lost even though the conversation itself happens off-site."
      />

      {sp.deleted && <Banner tone="success">Enquiry deleted.</Banner>}

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatTile label="All enquiries" value={total} />
        <StatTile label="Last 7 days" value={thisWeek} />
        <StatTile label="Form messages" value={formCount} hint="People who wrote to you directly" />
        <StatTile label="To follow up" value={unhandled} />
      </div>

      <form method="get" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label htmlFor="channel" className="field-label">Channel</label>
          <select id="channel" name="channel" defaultValue={channel} className="field sm:w-48">
            <option value="">All channels</option>
            {Object.entries(CHANNEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
          <input type="checkbox" name="open" value="1" defaultChecked={onlyOpen} className="h-4 w-4 accent-[#9b2c5a]" />
          Only ones still to follow up
        </label>
        <button type="submit" className="btn-primary">Filter</button>
        <Link href="/admin/enquiries" className="btn-ghost">Reset</Link>
      </form>

      <TableShell
        head={
          <tr>
            <th scope="col" className="px-4 py-3">When</th>
            <th scope="col" className="px-4 py-3">Channel</th>
            <th scope="col" className="px-4 py-3">Product / message</th>
            <th scope="col" className="px-4 py-3">Contact</th>
            <th scope="col" className="px-4 py-3 text-right">Actions</th>
          </tr>
        }
      >
        {enquiries.length === 0 ? (
          <EmptyRow colSpan={5}>
            {channel || onlyOpen
              ? "No enquiries match those filters."
              : "No enquiries logged yet. They'll appear here the moment someone clicks Enquire or sends the contact form."}
          </EmptyRow>
        ) : (
          enquiries.map((e) => (
            <tr key={e.id} className={e.handled ? "opacity-60" : undefined}>
              <td className="px-4 py-3 whitespace-nowrap text-ink-600">
                {e.createdAt.toLocaleString("en-IN", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {CHANNEL_LABELS[e.channel] ?? e.channel}
              </td>
              <td className="max-w-md px-4 py-3">
                {e.product ? (
                  <Link href={`/product/${e.product.slug}`} target="_blank" className="font-medium hover:text-rose-700">
                    {e.product.name} ↗
                  </Link>
                ) : (
                  <span className="text-ink-600">{e.pagePath || "—"}</span>
                )}
                {e.message && e.channel === "form" && (
                  <span className="mt-1 block text-[13px] text-ink-600">{e.message}</span>
                )}
              </td>
              <td className="px-4 py-3 text-[13px]">
                {e.name && <span className="block font-medium">{e.name}</span>}
                {e.phone && (
                  <a href={`tel:${e.phone}`} className="block text-ink-600 hover:text-rose-700">{e.phone}</a>
                )}
                {e.email && (
                  <a href={`mailto:${e.email}`} className="block text-ink-600 hover:text-rose-700">{e.email}</a>
                )}
                {!e.name && !e.phone && !e.email && <span className="text-ink-600">—</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <form action={toggleEnquiryHandledAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="handled" value={String(e.handled)} />
                    <button type="submit" className="btn-ghost btn-sm">
                      {e.handled ? "Reopen" : "Mark done"}
                    </button>
                  </form>
                  <DeleteButton
                    action={deleteEnquiryAction}
                    id={e.id}
                    confirmText="Delete this enquiry from the log?"
                  />
                </div>
              </td>
            </tr>
          ))
        )}
      </TableShell>

      {pageCount > 1 && (
        <nav aria-label="Enquiry pages" className="mt-5 flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={`/admin/enquiries?page=${page - 1}`} className="btn-ghost btn-sm">Previous</Link>
          ) : (
            <span aria-disabled="true" className="btn-ghost btn-sm cursor-not-allowed text-ink-600">Previous</span>
          )}
          <span>Page {page} of {pageCount}</span>
          {page < pageCount ? (
            <Link href={`/admin/enquiries?page=${page + 1}`} className="btn-ghost btn-sm">Next</Link>
          ) : (
            <span aria-disabled="true" className="btn-ghost btn-sm cursor-not-allowed text-ink-600">Next</span>
          )}
        </nav>
      )}
    </>
  );
}
