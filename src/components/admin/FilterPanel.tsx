"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

/**
 * The secondary product filters — category, status, photo.
 *
 * These sat behind a closed disclosure triangle at every size, which reads as
 * "advanced": narrowing 590 products by category is the ordinary way to find
 * one, not an advanced move. But simply opening them by default pushed the
 * first product 883px down a 390px phone, which is the exact thing the
 * "usable on the phone the shop actually runs on" test exists to stop.
 *
 * So it depends on the room available. A phone renders collapsed and shows a
 * labelled button with a count of what is currently applied; a desktop, where
 * the panel costs nothing anyone can feel, opens it after hydration. The
 * server renders the collapsed state, so a phone never flashes it open.
 *
 * The fields stay mounted either way — a collapsed panel still submits the
 * category you picked before collapsing it.
 */
export default function FilterPanel({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const query = "(min-width: 640px)";
  const subscribe = useCallback((notify: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", notify);
    return () => mql.removeEventListener("change", notify);
  }, []);
  const roomForIt = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );

  // Null until someone clicks: the panel follows the screen size, and their
  // choice wins from then on.
  const [toggled, setToggled] = useState<boolean | null>(null);

  // A filtered list always shows the filter that narrowed it, at any size and
  // ahead of the screen-size default. A list of 12 that silently hides the
  // "draft only" filter reads as a catalogue of 12, which is how someone ends
  // up re-adding stock they already have.
  const open = toggled ?? (activeCount > 0 || roomForIt);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setToggled(!open)}
        aria-expanded={open}
        aria-controls="product-filters"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-rose-700"
      >
        <span aria-hidden className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          ›
        </span>
        Category, status and photo
        {activeCount > 0 && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
            {activeCount}
          </span>
        )}
      </button>

      <div id="product-filters" className={open ? "mt-3" : "hidden"}>
        {children}
      </div>
    </div>
  );
}
