"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export type PinnableProduct = {
  id: string;
  name: string;
  categoryName: string;
  price: string;
  imageUrl: string | null;
  pinned: boolean;
};

/** How many unpinned products to draw before asking you to type. */
const BROWSE_LIMIT = 12;

/**
 * Picks which products are pinned to "New Arrivals".
 *
 * This was 60 product cards rendered flat, one per row on a phone — about
 * 5400px of the homepage editor's 7168px, to choose the handful that get
 * pinned. It draws everything pinned plus a capped window of the rest now,
 * and you type to find a product rather than scrolling to it.
 *
 * Pinned products are ALWAYS rendered, whatever the filter says. These
 * checkboxes are the submission: saveHomepageAction clears every `featured`
 * flag and re-pins from the boxes that arrive, so a pinned product left out of
 * the DOM would be quietly unpinned on save. Their order in the DOM is also
 * their order on the homepage, which is why they come first.
 */
export default function PinPicker({ products }: { products: PinnableProduct[] }) {
  const [filter, setFilter] = useState("");
  const [pinned, setPinned] = useState<Set<string>>(
    () => new Set(products.filter((p) => p.pinned).map((p) => p.id)),
  );

  const needle = filter.trim().toLowerCase();
  const { picked, shown, hiddenCount, matchCount } = useMemo(() => {
    const matches = needle
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(needle) ||
            p.categoryName.toLowerCase().includes(needle),
        )
      : products;
    const picked = products.filter((p) => pinned.has(p.id));
    const rest = matches.filter((p) => !pinned.has(p.id));
    return {
      picked,
      shown: rest.slice(0, BROWSE_LIMIT),
      hiddenCount: rest.length - Math.min(rest.length, BROWSE_LIMIT),
      matchCount: rest.length,
    };
  }, [products, pinned, needle]);

  const toggle = (id: string, on: boolean) =>
    setPinned((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const row = (p: PinnableProduct) => (
    <li key={p.id}>
      <label className="card flex min-w-0 cursor-pointer items-center gap-3 p-2.5 hover:bg-rose-50">
        <input
          type="checkbox"
          name="featured"
          value={p.id}
          checked={pinned.has(p.id)}
          onChange={(e) => toggle(p.id, e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[#9b2c5a]"
        />
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line bg-rose-50">
          {p.imageUrl && (
            <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{p.name}</span>
          <span className="block truncate text-[12px] text-ink-600">
            {p.categoryName} · {p.price}
          </span>
        </span>
      </label>
    </li>
  );

  return (
    <>
      <label htmlFor="pin-filter" className="sr-only">
        Search products to pin
      </label>
      <input
        id="pin-filter"
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search by product or category…"
        className="field"
      />

      <p className="mt-2 text-[13px] text-ink-600">
        {pinned.size === 0
          ? "Nothing pinned — New Arrivals is showing the most recently added products automatically."
          : `${pinned.size} pinned, in this order. Untick everything to go back to automatic.`}
      </p>

      {picked.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{picked.map(row)}</ul>
      )}

      {picked.length > 0 && shown.length > 0 && (
        <p className="mt-4 text-[13px] font-semibold text-ink-600">Other products</p>
      )}

      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{shown.map(row)}</ul>

      {shown.length === 0 && needle && (
        <p className="mt-2 text-sm text-ink-600">No products match “{filter}”.</p>
      )}
      {hiddenCount > 0 && (
        <p className="mt-2 text-[13px] text-ink-600">
          Showing {shown.length} of {matchCount} other products
          {needle ? " that match" : ""} — type above to narrow it down.
        </p>
      )}
    </>
  );
}
