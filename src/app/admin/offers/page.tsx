import Link from "next/link";
import { PageHeader, TableShell, EmptyRow, Banner } from "@/components/admin/ui";
import OfferForm from "@/components/admin/OfferForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteOfferAction } from "@/lib/admin-actions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function statusOf(o: { startsAt: Date; endsAt: Date; published: boolean }) {
  const now = new Date();
  if (!o.published) return { label: "Draft", tone: "bg-marigold-100 text-marigold-700" };
  if (o.startsAt > now) return { label: "Scheduled", tone: "bg-rose-100 text-rose-700" };
  if (o.endsAt < now) return { label: "Ended", tone: "bg-line text-ink-600" };
  return { label: "Live", tone: "bg-sage-100 text-sage-700" };
}

export default async function AdminOffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const [offers, products] = await Promise.all([
    db.offer.findMany({
      orderBy: { endsAt: "desc" },
      include: { products: { select: { productId: true } } },
    }),
    db.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: { select: { name: true } } },
    }),
  ]);

  const editing = sp.edit ? offers.find((o) => o.id === sp.edit) : undefined;
  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.category.name,
  }));

  return (
    <>
      <PageHeader
        title="Offers & campaigns"
        description="Named, time-bound sales. A campaign appears on the site between its dates and hides itself automatically once it ends."
        action={
          editing ? (
            <Link href="/admin/offers" className="btn-ghost">Start a new campaign</Link>
          ) : undefined
        }
      />

      {sp.saved && <Banner tone="success">Saved “{sp.saved}”.</Banner>}
      {sp.deleted && <Banner tone="success">Campaign deleted.</Banner>}

      <TableShell
        head={
          <tr>
            <th scope="col" className="px-4 py-3">Campaign</th>
            <th scope="col" className="px-4 py-3">Dates</th>
            <th scope="col" className="px-4 py-3">Products</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3 text-right">Actions</th>
          </tr>
        }
      >
        {offers.length === 0 ? (
          <EmptyRow colSpan={5}>No campaigns yet — create your first one below.</EmptyRow>
        ) : (
          offers.map((o) => {
            const s = statusOf(o);
            return (
              <tr key={o.id} className={editing?.id === o.id ? "bg-rose-50" : undefined}>
                <td className="px-4 py-3">
                  <span className="block font-medium">{o.title}</span>
                  <span className="block max-w-md text-[12px] text-ink-600">{o.description}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-600">
                  {iso(o.startsAt)} → {iso(o.endsAt)}
                </td>
                <td className="px-4 py-3 text-ink-600">{o.products.length}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${s.tone}`}>
                    {s.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href="/offers" target="_blank" className="btn-ghost btn-sm">Preview ↗</Link>
                    <Link href={`/admin/offers?edit=${o.id}`} className="btn-ghost btn-sm">Edit</Link>
                    <DeleteButton
                      action={deleteOfferAction}
                      id={o.id}
                      confirmText={`Delete the campaign "${o.title}"? The products themselves are not deleted.`}
                    />
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </TableShell>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-2xl">
          {editing ? `Edit “${editing.title}”` : "New campaign"}
        </h2>
        <OfferForm
          key={editing?.id ?? "new"}
          products={productOptions}
          values={
            editing
              ? {
                  id: editing.id,
                  title: editing.title,
                  description: editing.description,
                  bannerUrl: editing.bannerUrl ?? "",
                  startsAt: iso(editing.startsAt),
                  endsAt: iso(editing.endsAt),
                  published: editing.published,
                  productIds: editing.products.map((p) => p.productId),
                }
              : { startsAt: iso(new Date()), published: true }
          }
        />
      </section>
    </>
  );
}
