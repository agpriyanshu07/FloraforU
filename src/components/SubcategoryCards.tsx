import Image from "next/image";
import Link from "next/link";
import type { SubcategoryCardData } from "@/lib/subcategory-chips";

/**
 * The photo grid of a category's subcategories, shown at the top of a
 * category page before anything is picked: the shop's own site leads with
 * these, and a photo says "Chakri" faster than a word does.
 *
 * Each card is the same link its chip is, so a card and a chip can never
 * disagree about where they go. Once a subcategory is picked the page hides
 * these and leaves the chips to switch between them — a second screenful of
 * photos above the products would push the products off a phone entirely.
 */
export default function SubcategoryCards({
  basePath,
  subcategories,
  carry,
}: {
  basePath: string;
  subcategories: SubcategoryCardData[];
  carry: Record<string, string | undefined>;
}) {
  if (subcategories.length === 0) return null;

  const href = (sub: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(carry)) {
      if (value && key !== "sub" && key !== "page") params.set(key, value);
    }
    params.set("sub", sub);
    return `${basePath}?${params.toString()}#products`;
  };

  return (
    <section aria-label="Shop by type" className="mb-8">
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {subcategories.map((s, i) => (
          <li key={s.slug}>
            <Link
              href={href(s.slug)}
              className="card group flex h-full flex-col overflow-hidden transition-shadow duration-200 hover:shadow-[0_8px_28px_-12px_rgba(155,44,90,0.28)]"
            >
              <div className="relative aspect-[4/3] bg-rose-50">
                {s.imageUrl && (
                  <Image
                    src={s.imageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 50vw, 300px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    priority={i < 4}
                  />
                )}
                <div
                  aria-hidden
                  className={`absolute inset-0 ${s.imageUrl ? "bg-gradient-to-t from-black/70 via-black/15 to-transparent" : ""}`}
                />
                <h2
                  className={`absolute inset-x-0 bottom-0 p-3 font-display text-lg leading-tight sm:p-4 sm:text-2xl ${
                    s.imageUrl ? "text-white" : "text-ink-900"
                  }`}
                >
                  {s.name}
                </h2>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
                {s.description && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-ink-600">{s.description}</p>
                )}
                <p className="mt-auto text-[13px] font-semibold text-rose-600">
                  {s.count} {s.count === 1 ? "item" : "items"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
