import Link from "next/link";

export type SubcategoryChip = {
  slug: string;
  name: string;
  count: number;
};

/**
 * The subcategory filter on a category page.
 *
 * Deliberately links rather than scripts. Every chip is a real URL, so a
 * filtered list can be shared, bookmarked, sent in a WhatsApp message and
 * opened by someone who never saw the page it came from — which is how this
 * shop actually sends people to stock. It also means the filter works before
 * any JavaScript loads, on the patchy connections the shop's customers are on.
 *
 * Only subcategories with stock in them are passed in. A chip that leads to an
 * empty grid is worse than no chip: it reads as a broken page rather than as a
 * section the shop has not filled yet.
 *
 * Carrying `q`, `sort` and the other filters through each link matters more
 * than it looks. Dropping them would silently reset a search the moment
 * someone narrowed it, so "fog" + "SFX" would quietly become all of SFX.
 * `page` is deliberately NOT carried: a new filter is a new list, and page 3
 * of the old one is meaningless in it.
 */
export default function SubcategoryFilter({
  basePath,
  subcategories,
  active,
  totalCount,
  carry,
}: {
  basePath: string;
  subcategories: SubcategoryChip[];
  active?: string;
  totalCount: number;
  carry: Record<string, string | undefined>;
}) {
  if (subcategories.length === 0) return null;

  const href = (sub?: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(carry)) {
      if (value && key !== "sub" && key !== "page") params.set(key, value);
    }
    if (sub) params.set("sub", sub);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const chip = (isActive: boolean) =>
    `inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? "border-rose-600 bg-rose-600 text-white"
        : "border-line bg-surface text-ink-900 hover:border-rose-300 hover:bg-rose-50"
    }`;

  return (
    <nav aria-label="Filter by type" className="mb-6">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={href()}
            aria-current={!active ? "true" : undefined}
            className={chip(!active)}
          >
            All
            <span
              className={`text-[12px] tabular-nums ${!active ? "text-rose-100" : "text-ink-600"}`}
            >
              {totalCount}
            </span>
          </Link>
        </li>
        {subcategories.map((s) => {
          const isActive = s.slug === active;
          return (
            <li key={s.slug}>
              <Link
                href={href(s.slug)}
                aria-current={isActive ? "true" : undefined}
                className={chip(isActive)}
              >
                {s.name}
                <span
                  className={`text-[12px] tabular-nums ${isActive ? "text-rose-100" : "text-ink-600"}`}
                >
                  {s.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
