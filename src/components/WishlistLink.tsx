"use client";

import Link from "next/link";
import { HeartIcon } from "./icons";
import { useWishlist } from "@/lib/wishlist";

/**
 * Header entry point for the saved list, with a live count.
 *
 * The count comes from the visitor's own browser, so the server cannot know it.
 * useSyncExternalStore returns an empty list through hydration and re-renders
 * with the real one straight after — no badge on the server, the right badge a
 * moment later, and no hydration mismatch in between.
 */
export default function WishlistLink() {
  const count = useWishlist().length;

  return (
    <Link
      href="/wishlist"
      aria-label={
        count > 0
          ? `Saved items — ${count} ${count === 1 ? "item" : "items"}`
          : "Saved items"
      }
      className="relative grid h-11 w-11 place-items-center rounded-full text-ink-600 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-700"
    >
      <HeartIcon className={`h-5 w-5 ${count > 0 ? "fill-rose-600 text-rose-600" : ""}`} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-none text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
