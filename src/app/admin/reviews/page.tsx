import Link from "next/link";
import { PageHeader, TableShell, EmptyRow, Banner } from "@/components/admin/ui";
import SimpleForm from "@/components/admin/SimpleForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteReviewAction, moderateReviewAction, saveReviewAction } from "@/lib/admin-actions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  // Default to the pending queue: an unattended queue is the one real risk of
  // opening a public submission form, so it is what the page opens on.
  const pendingCount = await db.review.count({ where: { status: "pending" } });
  const tab = sp.status ?? (pendingCount > 0 ? "pending" : "all");

  const reviews = await db.review.findMany({
    where: tab === "all" ? {} : { status: tab },
    orderBy: [{ status: "asc" }, { displayOrder: "asc" }],
    include: { product: { select: { name: true, slug: true } } },
  });
  const editing = sp.edit ? reviews.find((r) => r.id === sp.edit) : undefined;

  const TABS = [
    { key: "pending", label: `Pending${pendingCount ? ` (${pendingCount})` : ""}` },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Paste real reviews from Instagram DMs, WhatsApp or the shop counter. Never invent one — they're the main trust signal on the site."
      />

      {sp.saved && <Banner tone="success">Review saved.</Banner>}
      {sp.deleted && <Banner tone="success">Review deleted.</Banner>}
      {sp.moderated === "approved" && (
        <Banner tone="success">Review approved — it&apos;s live on the site now.</Banner>
      )}
      {sp.moderated === "rejected" && (
        <Banner tone="success">
          Review rejected. It stays here but will never show on the site.
        </Banner>
      )}

      <nav aria-label="Filter reviews by status" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/reviews?status=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === t.key
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-ink-600 hover:bg-rose-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[2.2fr_1fr]">
        <TableShell
          head={
            <tr>
              <th scope="col" className="px-4 py-3">Customer</th>
              <th scope="col" className="px-4 py-3">Review</th>
              <th scope="col" className="px-4 py-3">Rating</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
        >
          {reviews.length === 0 ? (
            <EmptyRow colSpan={5}>
              No reviews yet. The public Reviews page still renders correctly — it shows an
              invitation to send one instead of a broken empty layout.
            </EmptyRow>
          ) : (
            reviews.map((r) => (
              <tr key={r.id} className={editing?.id === r.id ? "bg-rose-50" : undefined}>
                <td className="px-4 py-3">
                  <span className="block font-medium">{r.customerName}</span>
                  <span className="block text-[12px] text-ink-600">{r.eventType} · {r.source}</span>
                  {r.product && (
                    <span className="block text-[12px] text-rose-700">on {r.product.name}</span>
                  )}
                </td>
                <td className="max-w-sm px-4 py-3 text-[13px] text-ink-600">
                  {r.quote.length > 120 ? `${r.quote.slice(0, 120)}…` : r.quote}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{r.rating} / 5</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      r.status === "pending"
                        ? "bg-marigold-100 text-marigold-700"
                        : r.status === "rejected"
                          ? "bg-line text-ink-600"
                          : r.visible
                            ? "bg-sage-100 text-sage-700"
                            : "bg-line text-ink-600"
                    }`}
                  >
                    {r.status === "pending"
                      ? "Pending"
                      : r.status === "rejected"
                        ? "Rejected"
                        : r.visible
                          ? "Live"
                          : "Hidden"}
                  </span>
                  {r.submittedByCustomer && (
                    <span className="mt-1 block text-[11px] text-ink-600">
                      From the website form
                    </span>
                  )}
                  {r.contactHint && (
                    <span className="mt-1 block text-[11px] text-ink-600">
                      Contact: {r.contactHint}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {r.status !== "approved" && (
                      <form action={moderateReviewAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <button type="submit" className="btn-primary btn-sm">Approve</button>
                      </form>
                    )}
                    {r.status !== "rejected" && (
                      <form action={moderateReviewAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <button type="submit" className="btn-ghost btn-sm">Reject</button>
                      </form>
                    )}
                    <Link href={`/admin/reviews?edit=${r.id}`} className="btn-ghost btn-sm">Edit</Link>
                    <DeleteButton
                      action={deleteReviewAction}
                      id={r.id}
                      confirmText={`Delete the review from ${r.customerName}?`}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </TableShell>

        <SimpleForm
          key={editing?.id ?? "new"}
          id={editing?.id}
          action={saveReviewAction}
          title={editing ? `Edit review from ${editing.customerName}` : "Add a review"}
          submitLabel={editing ? "Save changes" : "Add review"}
          cancelHref={editing ? "/admin/reviews" : undefined}
          values={{
            customerName: editing?.customerName,
            eventType: editing?.eventType,
            quote: editing?.quote,
            rating: editing?.rating ?? 5,
            source: editing?.source ?? "Instagram DM",
            sourceUrl: editing?.sourceUrl ?? "",
            visible: editing?.visible ?? true,
            displayOrder: editing?.displayOrder ?? reviews.length,
          }}
          fields={[
            { kind: "text", name: "customerName", label: "Customer name or initials", required: true },
            { kind: "text", name: "eventType", label: "Event / context", placeholder: "e.g. Wedding — Dhanbad" },
            { kind: "textarea", name: "quote", label: "Review text", required: true, rows: 5 },
            { kind: "number", name: "rating", label: "Rating (1–5)", min: 1, max: 5 },
            {
              kind: "select",
              name: "source",
              label: "Where it came from",
              options: [
                { value: "Instagram DM", label: "Instagram DM" },
                { value: "Instagram comment", label: "Instagram comment" },
                { value: "WhatsApp", label: "WhatsApp" },
                { value: "In person", label: "In person" },
                { value: "Google", label: "Google" },
              ],
            },
            {
              kind: "text",
              name: "sourceUrl",
              label: "Link to the original post (optional)",
              placeholder: "https://www.instagram.com/p/…",
              hint: "For a quote taken from an Instagram comment. Shown as a link so anyone can check it.",
            },
            { kind: "number", name: "displayOrder", label: "Display order", min: 0 },
            { kind: "checkbox", name: "visible", label: "Show on the site", hint: "Untick to hide without deleting." },
          ]}
        />
      </div>
    </>
  );
}
