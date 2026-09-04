import type { Metadata } from "next";
import CategoryCard from "@/components/CategoryCard";
import EmptyState from "@/components/EmptyState";
import { BoxIcon } from "@/components/icons";
import { getCategoriesWithCounts } from "@/lib/queries";

// Cached; admin writes revalidate this path explicitly, so the window is a backstop.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All categories",
  description:
    "Browse every FloralforU category — artificial flowers, backdrops and cloths, lights, lamps and diyas, pots, SFX, Rajasthani décor, packing material, gift boxes, carpets and more.",
};

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts();

  return (
    <div className="shell py-10">
      <header className="mb-8 max-w-3xl">
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)]">
          Shop by category
        </h1>
        <p className="mt-2 text-ink-600">
          We stock across {categories.length} categories — some sorted by what the
          product is, some by what it&apos;s for. Both work; pick whichever matches
          how you&apos;re planning your event.
        </p>
      </header>

      {categories.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <li key={c.id} className="flex">
              <CategoryCard
                slug={c.slug}
                name={c.name}
                description={c.description}
                imageUrl={c.imageUrl}
                count={c._count.products}
                priority={i < 3}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No categories yet"
          body="Categories added in the admin portal will show up here."
          icon={<BoxIcon className="h-8 w-8" />}
        />
      )}
    </div>
  );
}
