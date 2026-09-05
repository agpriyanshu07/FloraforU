import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { PRODUCT_CARD_SELECT } from "@/lib/queries";

/**
 * Resolves saved slugs into products for the wishlist page.
 *
 * The list itself never leaves the visitor's browser — this only answers "what
 * are these items", the same question anyone could ask by opening the product
 * pages one at a time. Nothing is stored, and no wishlist is associated with
 * anyone here.
 *
 * A POST rather than a GET because a long list of slugs in a query string runs
 * into URL length limits, and this keeps saved items out of access logs.
 */
const schema = z.object({
  // Bounded to match the client's own cap, so a hand-made request can't ask us
  // to look up thousands of rows.
  slugs: z.array(z.string().trim().max(120)).max(60),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const slugs = parsed.data.slugs.filter(Boolean);
  if (slugs.length === 0) return NextResponse.json({ ok: true, products: [] });

  const products = await db.product.findMany({
    where: { slug: { in: slugs }, published: true },
    select: PRODUCT_CARD_SELECT,
  });

  // Returned in the order the customer saved them, not the order the database
  // happened to return. Unpublished or deleted items simply fall out of the
  // list — the page counts them so it can say so rather than quietly losing them.
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const ordered = slugs.map((s) => bySlug.get(s)).filter((p) => p !== undefined);

  return NextResponse.json({ ok: true, products: ordered });
}
