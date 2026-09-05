import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Type-ahead suggestions for the header search.
 *
 * Deliberately thin: it returns just enough to draw a suggestion row, and the
 * full search still happens on /catalogue, which already matches across name,
 * spec, code, description and category and handles filters, sorting and paging.
 * Duplicating that here would give us two search behaviours to keep in step.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  // One character matches most of the catalogue, which is neither a useful
  // suggestion nor a cheap query.
  if (q.length < 2) return NextResponse.json({ products: [] });

  // Bounded so a pasted essay can't turn into an expensive LIKE.
  const term = q.slice(0, 80);
  // Case-insensitive explicitly: PostgreSQL's `contains` is case-SENSITIVE, so
  // without this "fog" finds nothing while "Fog" works.
  const like = (value: string) => ({ contains: value, mode: "insensitive" as const });

  const products = await db.product.findMany({
    where: {
      published: true,
      OR: [
        { name: like(term) },
        { spec: like(term) },
        { code: like(term) },
        { category: { name: like(term) } },
      ],
    },
    orderBy: { name: "asc" },
    take: 6,
    select: {
      slug: true,
      name: true,
      price: true,
      priceOnEnquiry: true,
      category: { select: { name: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        take: 1,
        select: { url: true },
      },
    },
  });

  return NextResponse.json({
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      price: p.price,
      priceOnEnquiry: p.priceOnEnquiry,
      categoryName: p.category.name,
      imageUrl: p.images[0]?.url ?? null,
    })),
  });
}
