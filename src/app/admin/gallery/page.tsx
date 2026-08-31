import Link from "next/link";
import Image from "next/image";
import { PageHeader, TableShell, EmptyRow, Banner } from "@/components/admin/ui";
import SimpleForm from "@/components/admin/SimpleForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteGalleryAction, saveGalleryAction } from "@/lib/admin-actions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const items = await db.galleryItem.findMany({ orderBy: { displayOrder: "asc" } });
  const editing = sp.edit ? items.find((i) => i.id === sp.edit) : undefined;

  return (
    <>
      <PageHeader
        title="Gallery & dispatch"
        description="Event setups, packed-for-delivery photos and Instagram reels. Reel links added here also power the Instagram section on the homepage."
      />

      {sp.saved && <Banner tone="success">Gallery item saved.</Banner>}
      {sp.deleted && <Banner tone="success">Gallery item deleted.</Banner>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <TableShell
          head={
            <tr>
              <th scope="col" className="px-4 py-3">Item</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Section</th>
              <th scope="col" className="px-4 py-3">Shown</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
        >
          {items.length === 0 ? (
            <EmptyRow colSpan={5}>No gallery items yet — add one on the right.</EmptyRow>
          ) : (
            items.map((i) => (
              <tr key={i.id} className={editing?.id === i.id ? "bg-rose-50" : undefined}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-rose-50">
                      {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
                    </span>
                    <span>
                      <span className="block font-medium">{i.title}</span>
                      <span className="block max-w-xs truncate text-[12px] text-ink-600">
                        {i.embedUrl || i.imageUrl}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-600">{i.kind === "reel" ? "Reel" : "Photo"}</td>
                <td className="px-4 py-3 text-ink-600 capitalize">{i.tag}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${i.visible ? "bg-sage-100 text-sage-700" : "bg-line text-ink-600"}`}>
                    {i.visible ? "Live" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/gallery?edit=${i.id}`} className="btn-ghost btn-sm">Edit</Link>
                    <DeleteButton
                      action={deleteGalleryAction}
                      id={i.id}
                      confirmText={`Delete "${i.title}" from the gallery?`}
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
          action={saveGalleryAction}
          title={editing ? `Edit “${editing.title}”` : "Add to the gallery"}
          submitLabel={editing ? "Save changes" : "Add item"}
          cancelHref={editing ? "/admin/gallery" : undefined}
          values={{
            title: editing?.title,
            kind: editing?.kind ?? "photo",
            tag: editing?.tag ?? "event",
            imageUrl: editing?.imageUrl ?? "",
            embedUrl: editing?.embedUrl ?? "",
            alt: editing?.alt ?? "",
            visible: editing?.visible ?? true,
            displayOrder: editing?.displayOrder ?? items.length,
          }}
          fields={[
            { kind: "text", name: "title", label: "Title", required: true, placeholder: "e.g. Wedding stage — floral backdrop" },
            {
              kind: "select",
              name: "kind",
              label: "Type",
              options: [
                { value: "photo", label: "Photo" },
                { value: "reel", label: "Instagram reel / post" },
              ],
            },
            {
              kind: "select",
              name: "tag",
              label: "Section",
              options: [
                { value: "event", label: "Event setups" },
                { value: "dispatch", label: "Packed & dispatched" },
                { value: "shop", label: "At the shop" },
              ],
            },
            { kind: "text", name: "imageUrl", label: "Image URL (photos)", mono: true, placeholder: "/img/gallery/g1.svg" },
            {
              kind: "text",
              name: "embedUrl",
              label: "Instagram link (reels)",
              mono: true,
              placeholder: "https://www.instagram.com/p/XXXXXXXXXXX/",
              hint: "Paste the post or reel permalink — it embeds on the homepage and gallery.",
            },
            {
              kind: "text",
              name: "alt",
              label: "Alt text",
              hint: "Describe the photo for screen readers. Falls back to the title if left blank.",
            },
            { kind: "number", name: "displayOrder", label: "Display order", min: 0 },
            { kind: "checkbox", name: "visible", label: "Show on the site" },
          ]}
        />
      </div>
    </>
  );
}
