import "server-only";
import { db } from "./db";
import type { SubcategoryChip } from "@/components/SubcategoryFilter";

export type SubcategoryCardData = SubcategoryChip & {
  description: string;
  /** The admin's chosen photo, else the first photographed product in it. */
  imageUrl: string | null;
};

/**
 * The subcategories of one category with stock in them, plus the category's
 * published total for the "All" chip. Shared by /categories/[slug] and
 * /catalogue?category=…, so every route into a category offers the same way
 * to narrow it.
 *
 * Counts are of PUBLISHED stock only, to match what the grid will show.
 * Counting every row would put "Jar Hampers 78" on a chip that then opens a
 * list of 74, and the first thing a shopper would conclude is that four
 * products failed to load. Empty subcategories are dropped: a chip or card
 * that leads to an empty grid reads as a broken page.
 *
 * The total is the category's, not the current result count, which is the
 * count AFTER any subcategory filter -- so once a chip was picked, "All" would
 * claim the number already on screen.
 */
export async function getSubcategoryChips(
  categorySlug: string,
): Promise<{ chips: SubcategoryCardData[]; total: number }> {
  const published = { published: true };
  const [subcategories, total] = await Promise.all([
    db.subcategory.findMany({
      where: { category: { slug: categorySlug } },
      orderBy: { displayOrder: "asc" },
      select: {
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        _count: { select: { products: { where: published } } },
        // A cover for subcategories the shop hasn't given a photo yet, so a
        // new one never shows up as a blank card.
        products: {
          where: { ...published, images: { some: {} } },
          orderBy: [{ featured: "desc" }, { createdAt: "asc" }, { id: "asc" }],
          take: 1,
          select: {
            images: {
              orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    }),
    db.product.count({ where: { ...published, category: { slug: categorySlug } } }),
  ]);

  const chips = subcategories
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      count: s._count.products,
      description: s.description,
      imageUrl: s.imageUrl || s.products[0]?.images[0]?.url || null,
    }))
    .filter((s) => s.count > 0);

  return { chips, total };
}
