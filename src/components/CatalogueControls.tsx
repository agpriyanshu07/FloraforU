"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SearchIcon } from "./icons";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
] as const;

type Category = { slug: string; name: string };

/**
 * All catalogue state lives in the URL, so a filtered view is shareable,
 * bookmarkable and survives the browser back button.
 */
export default function CatalogueControls({
  categories,
  basePath = "/catalogue",
  lockedCategory,
}: {
  categories: Category[];
  basePath?: string;
  lockedCategory?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const firstRender = useRef(true);

  const push = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page"); // any filter change returns to page 1
    startTransition(() => {
      const qs = next.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  };

  // Debounced search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => {
      push((p) => (query ? p.set("q", query) : p.delete("q")));
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const sort = params.get("sort") ?? "newest";
  const category = params.get("category") ?? "";
  const isNew = params.get("new") === "1";
  const onOffer = params.get("offer") === "1";

  const toggle = (key: string, on: boolean) =>
    push((p) => (on ? p.delete(key) : p.set(key, "1")));

  return (
    <div className="card mb-6 flex flex-col gap-4 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <label htmlFor="catalogue-search" className="sr-only">
            Search products by name, code or spec
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-600" />
          <input
            id="catalogue-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search flowers, lights, pots, SFX…"
            className="field pl-10"
          />
        </div>

        {!lockedCategory && (
          <div>
            <label htmlFor="catalogue-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="catalogue-category"
              value={category}
              onChange={(e) =>
                push((p) =>
                  e.target.value ? p.set("category", e.target.value) : p.delete("category"),
                )
              }
              className="field md:w-56"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="catalogue-sort" className="sr-only">
            Sort products
          </label>
          <select
            id="catalogue-sort"
            value={sort}
            onChange={(e) => push((p) => p.set("sort", e.target.value))}
            className="field md:w-52"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink-900">Quick filters:</span>
        <button
          type="button"
          aria-pressed={isNew}
          onClick={() => toggle("new", isNew)}
          className={isNew ? "btn-accent btn-sm" : "btn-ghost btn-sm"}
        >
          New arrivals
        </button>
        <button
          type="button"
          aria-pressed={onOffer}
          onClick={() => toggle("offer", onOffer)}
          className={onOffer ? "btn-accent btn-sm" : "btn-ghost btn-sm"}
        >
          On offer
        </button>
        {(query || category || isNew || onOffer || sort !== "newest") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              startTransition(() => router.push(basePath, { scroll: false }));
            }}
            className="btn-ghost btn-sm"
          >
            Clear all
          </button>
        )}
        <span aria-live="polite" className="ml-auto text-sm text-ink-600">
          {isPending ? "Updating results…" : ""}
        </span>
      </div>
    </div>
  );
}
