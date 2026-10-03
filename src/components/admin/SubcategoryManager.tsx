import Image from "next/image";
import Link from "next/link";
import DeleteButton from "./DeleteButton";
import ImageUploader from "./ImageUploader";
import {
  deleteSubcategoryAction,
  moveSubcategoryAction,
  saveSubcategoryAction,
  saveSubcategoryCardAction,
} from "@/lib/admin-actions";

export type SubcategoryRow = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  description: string;
  imageUrl: string;
};

/**
 * The subcategory list for one category, shown while that category is open
 * for editing.
 *
 * It lives here rather than on a page of its own because a subcategory has no
 * meaning away from its parent — "Hanging" exists under both Lights and
 * Artificial Flowers and means something different in each. A separate
 * Subcategories section in the nav would have made the owner pick a category
 * from a dropdown before anything on screen made sense.
 *
 * Order is the order of the filter chips on the public category page, which is
 * why it is editable at all: the shop knows which types sell, and those should
 * be the chips nearest the left.
 */
export default function SubcategoryManager({
  categoryId,
  categoryName,
  categorySlug,
  subcategories,
  unfiledCount,
  error,
  uploadsEnabled,
  cardError,
}: {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  subcategories: SubcategoryRow[];
  unfiledCount: number;
  error?: string;
  uploadsEnabled: boolean;
  /** Id of the subcategory whose card form was rejected, if any. */
  cardError?: string;
}) {
  return (
    <section className="card p-5">
      <h2 className="font-display text-xl">Subcategories</h2>
      <p className="mt-1 text-sm text-ink-600">
        These become the photo cards and filter chips on{" "}
        <Link
          href={`/categories/${categorySlug}`}
          target="_blank"
          className="text-rose-600 underline hover:text-rose-700"
        >
          the {categoryName} page
        </Link>
        , in this order. Give each one a card photo and a short line below —
        without a photo, the card borrows one from its own products.
      </p>

      {subcategories.length === 0 ? (
        <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm">
          None yet, so this category shows one plain list. That is the right
          answer for a short one — add subcategories when the list gets long
          enough to be hard to scan.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {subcategories.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
              <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-rose-50">
                {s.imageUrl && (
                  <Image src={s.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{s.name}</span>
                <span className="block text-[12px] text-ink-600">
                  {s.productCount === 0 ? (
                    /* An empty subcategory is not shown to customers at all —
                       a chip leading to an empty grid reads as a broken page.
                       Saying so here stops it looking like the chip is simply
                       missing from the site. */
                    <>No products yet — hidden from the site until one is filed here</>
                  ) : (
                    <>
                      {s.productCount} product{s.productCount === 1 ? "" : "s"} ·{" "}
                      <span className="font-mono">?sub={s.slug}</span>
                    </>
                  )}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-1">
                {/* One form, two submit buttons carrying the direction. Two
                    separate forms per row put 31 of them on a page with seven
                    subcategories, and a category with twenty would have had
                    eighty. */}
                <form action={moveSubcategoryAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    name="direction"
                    value="up"
                    disabled={i === 0}
                    className="btn-ghost btn-sm disabled:opacity-40"
                    aria-label={`Move ${s.name} earlier`}
                  >
                    ↑
                  </button>
                  <button
                    type="submit"
                    name="direction"
                    value="down"
                    disabled={i === subcategories.length - 1}
                    className="btn-ghost btn-sm disabled:opacity-40"
                    aria-label={`Move ${s.name} later`}
                  >
                    ↓
                  </button>
                </form>

                <form action={saveSubcategoryAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="categoryId" value={categoryId} />
                  <label className="sr-only" htmlFor={`rename-${s.id}`}>
                    Rename {s.name}
                  </label>
                  <input
                    id={`rename-${s.id}`}
                    name="name"
                    defaultValue={s.name}
                    className="field h-10 w-36 py-1 text-sm"
                  />
                  <button type="submit" className="btn-ghost btn-sm">
                    Rename
                  </button>
                </form>

                <DeleteButton
                  action={deleteSubcategoryAction}
                  id={s.id}
                  confirmText={
                    s.productCount === 0
                      ? `Delete the subcategory "${s.name}"?`
                      : `Delete the subcategory "${s.name}"? Its ${s.productCount} product${s.productCount === 1 ? "" : "s"} stay in ${categoryName} — they just stop being filtered.`
                  }
                />
              </span>

              <details className="w-full" open={cardError === s.id}>
                <summary className="cursor-pointer text-sm text-rose-600 hover:text-rose-700">
                  {s.imageUrl || s.description ? "Edit card photo & description" : "Add card photo & description"}
                </summary>
                <form action={saveSubcategoryCardAction} className="mt-3 grid gap-3 rounded-lg bg-rose-50/50 p-3">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="categoryId" value={categoryId} />
                  <ImageUploader
                    name={`cardImage-${s.id}`}
                    defaultValue={s.imageUrl}
                    uploadsEnabled={uploadsEnabled}
                    label="Card photo"
                    max={1}
                    noun="card"
                  />
                  <div>
                    <label htmlFor={`desc-${s.id}`} className="field-label">
                      Line under the photo <span className="font-normal text-ink-600">(optional)</span>
                    </label>
                    <textarea
                      id={`desc-${s.id}`}
                      name="description"
                      rows={2}
                      maxLength={200}
                      defaultValue={s.description}
                      placeholder="e.g. Trays for hamper packing"
                      className="field"
                    />
                    {cardError === s.id && (
                      <span className="field-error">
                        That photo link didn&apos;t work — upload a photo or paste an https:// link.
                      </span>
                    )}
                  </div>
                  <div>
                    <button type="submit" className="btn-primary btn-sm">
                      Save card
                    </button>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}

      {unfiledCount > 0 && subcategories.length > 0 && (
        <p className="mt-3 text-sm text-ink-600">
          <strong>{unfiledCount}</strong> product
          {unfiledCount === 1 ? " in this category is" : "s in this category are"}{" "}
          not filed under any subcategory.{" "}
          {/* Not a warning. An unfiled product is fully visible under its
              category and only misses the chips, so this is information, not
              something broken. */}
          {/* Straight to the photo grid rather than the products list. These
              are the ones no rule could place, which in practice means the
              only way to tell them apart is to look at them. */}
          <Link
            href={`/admin/products/filing?categoryId=${categoryId}`}
            className="text-rose-600 underline hover:text-rose-700"
          >
            File them by photo
          </Link>
          .
        </p>
      )}

      <form action={saveSubcategoryAction} className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="categoryId" value={categoryId} />
        <div className="min-w-0 flex-1">
          <label htmlFor="new-subcategory" className="field-label">
            Add a subcategory
          </label>
          <input
            id="new-subcategory"
            name="name"
            required
            placeholder="e.g. Light Stands"
            className="field"
            aria-describedby={error ? "new-subcategory-error" : undefined}
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <span id="new-subcategory-error" className="field-error">
              {error}
            </span>
          )}
        </div>
        <button type="submit" className="btn-primary shrink-0">
          Add
        </button>
      </form>
    </section>
  );
}
