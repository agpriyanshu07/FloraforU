import Link from "next/link";
import { PageHeader, TableShell, EmptyRow, Banner } from "@/components/admin/ui";
import SimpleForm from "@/components/admin/SimpleForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteReviewAction, saveReviewAction } from "@/lib/admin-actions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const reviews = await db.review.findMany({ orderBy: { displayOrder: "asc" } });
  const editing = sp.edit ? reviews.find((r) => r.id === sp.edit) : undefined;

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Paste real reviews from Instagram DMs, WhatsApp or the shop counter. Never invent one — they're the main trust signal on the site."
      />

      {sp.saved && <Banner tone="success">Review saved.</Banner>}
      {sp.deleted && <Banner tone="success">Review deleted.</Banner>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <TableShell
          head={
            <tr>
              <th scope="col" className="px-4 py-3">Customer</th>
              <th scope="col" className="px-4 py-3">Review</th>
              <th scope="col" className="px-4 py-3">Rating</th>
              <th scope="col" className="px-4 py-3">Shown</th>
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
                </td>
                <td className="max-w-sm px-4 py-3 text-[13px] text-ink-600">
                  {r.quote.length > 120 ? `${r.quote.slice(0, 120)}…` : r.quote}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{r.rating} / 5</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${r.visible ? "bg-sage-100 text-sage-700" : "bg-line text-ink-600"}`}>
                    {r.visible ? "Live" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
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
            { kind: "number", name: "displayOrder", label: "Display order", min: 0 },
            { kind: "checkbox", name: "visible", label: "Show on the site", hint: "Untick to hide without deleting." },
          ]}
        />
      </div>
    </>
  );
}
