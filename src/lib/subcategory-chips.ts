import "server-only";
import { db } from "./db";
import type { SubcategoryChip } from "@/components/SubcategoryFilter";

/**
 * The subcategory chips for one category, plus the category's published total
 * for the "All" chip. Shared by /categories/[slug] and /catalogue?category=…,
 * so every route into a category offers the same way to narrow it.
 *
 * Counts are of PUBLISHED stock only, to match what the grid will show.
 * Counting every row would put "Jar Hampers 78" on a chip that then opens a
 * list of 74, and the first thing a shopper would conclude is that four
 * products failed to load. Empty subcategories are dropped: a chip that leads
 * to an empty grid reads as a broken page.
 *
 * The total is the category's, not the current result count, which is the
 * count AFTER any subcategory filter -- so once a chip was picked, "All" would
 * claim the number already on screen.
 */
export async function getSubcategoryChips(
  categorySlug: string,
): Promise<{ chips: SubcategoryChip[]; total: number }> {
  const [subcategories, total] = await Promise.all([
    db.subcategory.findMany({
      where: { category: { slug: categorySlug } },
      orderBy: { displayOrder: "asc" },
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: { published: true } } } },
      },
    }),
    db.product.count({ where: { published: true, category: { slug: categorySlug } } }),
  ]);

  const chips = subcategories
    .map((s) => ({ slug: s.slug, name: s.name, count: s._count.products }))
    .filter((s) => s.count > 0);

  return { chips, total };
}
