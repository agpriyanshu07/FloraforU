import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  const base = settings.siteUrl.replace(/\/$/, "");

  const [categories, products] = await Promise.all([
    db.category.findMany({ select: { slug: true, updatedAt: true } }),
    db.product.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticRoutes = [
    ["", 1.0],
    ["/catalogue", 0.9],
    ["/categories", 0.8],
    ["/offers", 0.7],
    ["/gallery", 0.6],
    ["/reviews", 0.6],
    ["/about", 0.5],
    ["/contact", 0.7],
  ] as const;

  return [
    ...staticRoutes.map(([path, priority]) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      priority,
    })),
    ...categories.map((c) => ({
      url: `${base}/categories/${c.slug}`,
      lastModified: c.updatedAt,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.6,
    })),
  ];
}
