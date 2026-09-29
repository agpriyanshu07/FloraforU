"use client";

import { useState } from "react";

export type OrderableCategory = { id: string; name: string };

/**
 * Sets the order categories appear in.
 *
 * This was a number box per category. Putting a category first meant typing 0
 * into it and then renumbering everything it had just displaced — sixteen
 * boxes to move one row, and nothing stopped two categories sharing a number.
 *
 * Moving a row up or down is the actual intent, so that is the control. The
 * submitted field names are unchanged (`categoryOrder_<id>`), each carrying
 * its position in the list, so the server action did not have to change and
 * positions can no longer collide.
 */
export default function CategoryOrder({ categories }: { categories: OrderableCategory[] }) {
  const [order, setOrder] = useState(categories);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row);
      return next;
    });
  };

  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {order.map((c, i) => (
        <li key={c.id} className="card flex min-w-0 items-center gap-3 p-2.5">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-50 text-[12px] font-bold text-rose-700"
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>

          {/* The homepage grid shows the first eight, so where the cut falls
              is worth seeing while you reorder rather than after saving. */}
          {i === 7 && (
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-ink-600">
              last on home
            </span>
          )}

          <span className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => move(i, i - 1)}
              disabled={i === 0}
              aria-label={`Move ${c.name} up`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, i + 1)}
              disabled={i === order.length - 1}
              aria-label={`Move ${c.name} down`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ↓
            </button>
          </span>

          <input type="hidden" name={`categoryOrder_${c.id}`} value={i} />
        </li>
      ))}
    </ol>
  );
}
