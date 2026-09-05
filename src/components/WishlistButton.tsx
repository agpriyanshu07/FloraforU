"use client";

import { HeartIcon } from "./icons";
import { toggle, useIsSaved } from "@/lib/wishlist";

/**
 * The save-for-later heart.
 *
 * Renders as "not saved" on the server, because the list lives in the visitor's
 * own browser and the server genuinely does not know it. useSyncExternalStore
 * handles the handover: it returns the server snapshot through hydration, then
 * re-renders with the real one, so there is no mismatch and no need to track
 * "have we mounted yet" by hand.
 */
export default function WishlistButton({
  slug,
  productName,
  className = "",
  variant = "icon",
}: {
  slug: string;
  productName: string;
  className?: string;
  /** "icon" for the corner of a card, "button" for the product page. */
  variant?: "icon" | "button";
}) {
  const on = useIsSaved(slug);
  const label = on
    ? `Remove ${productName} from your saved items`
    : `Save ${productName} for later`;

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={() => toggle(slug)}
        aria-pressed={on}
        className={`btn-ghost ${className}`}
      >
        <HeartIcon
          className={`h-4 w-4 transition-transform duration-200 ${
            on ? "fill-rose-600 text-rose-600 motion-safe:scale-110" : ""
          }`}
        />
        {on ? "Saved" : "Save for later"}
        <span className="sr-only"> — {productName}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={on}
      aria-label={label}
      title={label}
      // 44px target: the card corner is a classic mis-tap on a phone, and this
      // sits next to a link that navigates away.
      className={`grid h-11 w-11 place-items-center rounded-full bg-cream/90 text-ink-600 shadow-sm backdrop-blur transition-colors duration-200 hover:text-rose-600 ${className}`}
    >
      <HeartIcon
        className={`h-5 w-5 transition-transform duration-200 ${
          on ? "fill-rose-600 text-rose-600 motion-safe:scale-110" : ""
        }`}
      />
    </button>
  );
}
