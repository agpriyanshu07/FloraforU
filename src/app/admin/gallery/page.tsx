import Link from "next/link";
import Image from "next/image";
import { PageHeader, TableShell, EmptyRow, Banner } from "@/components/admin/ui";
import SimpleForm from "@/components/admin/SimpleForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteGalleryAction, saveGalleryAction } from "@/lib/admin-actions";
import { db } from "@/lib/db";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { isPlaceholderArt, stripSelection, stripStatus } from "@/lib/instagram-strip";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const items = await db.galleryItem.findMany({ orderBy: { displayOrder: "asc" } });
  const editing = sp.edit ? items.find((i) => i.id === sp.edit) : undefined;
  // Decided by the same selector the homepage runs, so this list cannot claim
  // something the strip does not draw.
  const onHomepage = stripSelection(items).length;

  return (
    <>
      <PageHeader
        title="Instagram strip"
        description="What shows in the Instagram section on the homepage. Paste a post or reel link and it embeds as a real Instagram post; add photos instead and those are used until a reel exists. The separate gallery page this once fed has been retired."
      />

      <Banner tone="info">
        {onHomepage > 0 ? (
          <>
            The homepage strip is showing <strong>{onHomepage}</strong> of these{" "}
            {onHomepage === 1 ? "item" : "items"}. Anything not marked Live is
            explained in the Shown column.
          </>
        ) : (
          <>
            Nothing here is on the homepage. The strip is falling back to the
            shop photos committed to the site, which is why it still looks right —
            add a reel link or a real photo and that takes over.
          </>
        )}
      </Banner>

      {sp.saved && <Banner tone="success">Gallery item saved.</Banner>}
      {sp.deleted && <Banner tone="success">Gallery item deleted.</Banner>}

      {/* The list gets the whole column and the form stacks under it, the way
          Offers has always worked. Side by side, the form took ~300px and the
          list was left with a track that could not fit its own columns: the
          Actions cell ended up 63-124px behind the form, which is the same
          "the buttons are off screen" complaint the card layout fixed on a
          phone. No breakpoint solves it, because how wide the list needs to be
          depends on the rows in it, not on the window. */}
      <div className="flex flex-col gap-8">
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
            <EmptyRow colSpan={5}>No gallery items yet — add one below.</EmptyRow>
          ) : (
            items.map((i) => (
              <tr key={i.id} className={editing?.id === i.id ? "bg-rose-50" : undefined}>
                <td data-label="" className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Placeholder artwork is pale line art on cream, which at
                        44px is an empty square — it read as "the image is
                        broken" rather than "this is generated filler". Say
                        which it is instead of showing a ghost. */}
                    <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-rose-50">
                      {isPlaceholderArt(i.imageUrl) ? (
                        <span className="text-center text-[8px] font-bold uppercase leading-tight tracking-wide text-ink-600">
                          No
                          <br />
                          photo
                        </span>
                      ) : i.imageUrl ? (
                        <Image src={i.imageUrl} alt="" fill sizes="44px" className="object-cover" />
                      ) : i.embedUrl ? (
                        <span className="text-[9px] font-bold uppercase text-rose-700">Reel</span>
                      ) : null}
                    </span>
                    {/* The URL was already capped; the title was not, so one
                        long caption widened the whole column and pushed the
                        Actions buttons behind the form beside it. Both are
                        capped now -- the full title is still in the tooltip
                        and in the edit form. */}
                    <span className="min-w-0">
                      <span className="block max-w-xs truncate font-medium" title={i.title}>
                        {i.title}
                      </span>
                      <span className="block max-w-xs truncate text-[12px] text-ink-600">
                        {i.embedUrl || i.imageUrl}
                      </span>
                    </span>
                  </div>
                </td>
                <td data-label="Type" className="px-4 py-3 text-ink-600">{i.kind === "reel" ? "Reel" : "Photo"}</td>
                <td data-label="Section" className="px-4 py-3 text-ink-600 capitalize">{i.tag}</td>
                <td data-label="Shown" className="px-4 py-3">
                  {(() => {
                    // "Live" used to mean nothing more than visible=true, which
                    // was wrong for every seeded placeholder: the strip skips
                    // those, so the admin insisted nine photos were on the
                    // homepage while the homepage showed none of them.
                    const status = stripStatus(i, items);
                    return (
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                          status.live ? "bg-sage-100 text-sage-700" : "bg-line text-ink-600"
                        }`}
                      >
                        {status.label}
                      </span>
                    );
                  })()}
                </td>
                <td data-label="Actions" className="px-4 py-3">
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

        {/* Same reason as the categories page: tapping Edit put the form
            1134px below the fold on a phone, so it looked like nothing had
            happened. While editing, it leads. */}
        <div className={editing ? "order-first" : undefined}>
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
            {
              kind: "image",
              name: "imageUrl",
              label: "Photo",
              uploadsEnabled: isCloudinaryConfigured(),
              hint: "Only used for Photo items. A reel link below takes precedence.",
            },
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
      </div>
    </>
  );
}
