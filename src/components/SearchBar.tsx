"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { SearchIcon } from "./icons";
import { formatPrice } from "@/lib/format";

type Suggestion = {
  slug: string;
  name: string;
  price: number | null;
  priceOnEnquiry: boolean;
  categoryName: string;
  imageUrl: string | null;
};

/**
 * Header search.
 *
 * A real <form> pointing at /catalogue, so it works with JavaScript off and
 * needs no client routing to do its job — the catalogue already searches across
 * name, spec, code, description and category, with filters, sorting and paging
 * on top. The suggestions below are an enhancement on that, never a replacement:
 * pressing Enter always runs the full search.
 *
 * Wired as a combobox rather than a div with a list under it, so it can be
 * driven from the keyboard: arrows move through suggestions, Enter opens the
 * highlighted one, Escape closes without navigating.
 */
export default function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const optionId = (i: number) => `${listId}-option-${i}`;

  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // The results are stored with the query that produced them, so a stale
  // response can never be shown against a newer term — and so nothing has to
  // be cleared from inside an effect.
  const [result, setResult] = useState<{ query: string; items: Suggestion[] }>({
    query: "",
    items: [],
  });

  const rootRef = useRef<HTMLDivElement>(null);

  const query = term.trim();
  const items = result.query === query ? result.items : [];

  // Debounced, and every in-flight request is abandoned when the term changes,
  // so slow responses can't arrive out of order and overwrite newer ones.
  useEffect(() => {
    // Under two characters matches most of the catalogue, which is no use as a
    // suggestion. Nothing is cleared here — `items` above simply stops matching.
    if (query.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((body) => setResult({ query, items: body.products ?? [] }))
        .catch(() => {
          // An aborted or failed request just means no suggestions. The form
          // underneath still submits, so search itself never breaks.
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Clicking away closes the list. Focus is handled separately, on blur within.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const showList = open && items.length > 0;

  function go(slug: string) {
    setOpen(false);
    setActive(-1);
    router.push(`/product/${slug}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!showList) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      // Wraps, and -1 means "back to what I typed" rather than a dead end.
      const next = active + delta;
      setActive(next < -1 ? items.length - 1 : next >= items.length ? -1 : next);
      return;
    }

    if (event.key === "Enter" && active >= 0) {
      // A highlighted suggestion wins over submitting the form.
      event.preventDefault();
      go(items[active].slug);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <form
        action="/catalogue"
        role="search"
        onSubmit={() => setOpen(false)}
        className="flex items-center"
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search the catalogue
        </label>
        <div className="relative w-full">
          {/* Icons are aria-hidden by default; the input carries the name. */}
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
          <input
            id={`${listId}-input`}
            name="q"
            type="search"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search flowers, lamps, pots…"
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            className="field h-11 w-full !pl-9"
          />
        </div>
      </form>

      {/* Screen readers are told how many results there are; sighted users can
          see the list. Both need to know when it changes. */}
      <p aria-live="polite" className="sr-only">
        {showList
          ? `${items.length} ${items.length === 1 ? "suggestion" : "suggestions"} available.`
          : ""}
      </p>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
          {items.map((item, i) => (
            <li
              key={item.slug}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              // The input keeps focus throughout, which is what lets
              // aria-activedescendant do its job — so this is a click target,
              // not a focus target.
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item.slug)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                i === active ? "bg-rose-50" : ""
              }`}
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-rose-50">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="block truncate text-[13px] text-ink-600">
                  {item.categoryName} · {formatPrice(item.price, item.priceOnEnquiry)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
