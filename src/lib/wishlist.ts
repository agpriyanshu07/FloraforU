"use client";

import { useSyncExternalStore } from "react";

/**
 * The customer's saved items.
 *
 * This site has no customer accounts and no cart by design — every path ends in
 * a WhatsApp message — so a saved list has nowhere on the server to belong to.
 * It lives in localStorage instead: private to that browser, no sign-in, and
 * nothing about it reaches us until the customer chooses to send it over.
 *
 * The honest limits of that, which the wishlist page states plainly rather than
 * letting someone discover the hard way: the list does not follow them to
 * another device, and clearing site data clears it.
 */
const KEY = "ffu:wishlist";
const LIMIT = 60;

/**
 * One shared empty array, never a fresh literal.
 *
 * useSyncExternalStore compares snapshots by identity, so returning a new []
 * on every read is an infinite render loop, not a harmless allocation. That is
 * exactly what the storage-unavailable path did at first: in a browser with
 * localStorage blocked, every page carrying a heart died with "maximum update
 * depth exceeded".
 */
const EMPTY: string[] = [];

/** Read as an external store so React re-renders every heart on the page at once. */
let listeners: Array<() => void> = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  // A second tab is the same person with the same list; keep them in step.
  window.addEventListener("storage", onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
    window.removeEventListener("storage", onChange);
  };
}

function emit() {
  for (const l of listeners) l();
}

/**
 * The parsed snapshot is cached because useSyncExternalStore compares
 * getSnapshot results by identity: returning a fresh array each call would
 * re-render forever.
 */
let cachedRaw: string | null = null;
let cachedList: string[] = EMPTY;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Private mode, or storage disabled. An empty list is the safe reading:
    // the hearts simply won't remember, rather than the page failing.
    return EMPTY;
  }

  if (raw === cachedRaw) return cachedList;

  let parsed: string[] = [];
  try {
    const value = raw ? JSON.parse(raw) : [];
    // Anything could be under this key — another script, an older format, a
    // half-written value. Only keep what is actually a list of slugs.
    if (Array.isArray(value)) {
      parsed = value.filter((s): s is string => typeof s === "string").slice(0, LIMIT);
    }
  } catch {
    parsed = [];
  }

  cachedRaw = raw;
  cachedList = parsed;
  return parsed;
}

function write(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, LIMIT)));
  } catch {
    // Quota or private mode. The in-memory snapshot below still updates, so the
    // heart responds for this page view even though it can't be remembered.
  }
  cachedRaw = null;
  emit();
}

export function toggle(slug: string) {
  const list = read();
  // Newest first, so the wishlist page reads in the order things were saved.
  write(list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list]);
}

export function remove(slug: string) {
  write(read().filter((s) => s !== slug));
}

export function clear() {
  write([]);
}

/** The saved slugs. Empty on the server, so the markup matches first paint. */
export function useWishlist(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useIsSaved(slug: string): boolean {
  return useWishlist().includes(slug);
}
