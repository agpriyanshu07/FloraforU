"use client";

import { useEffect, useState } from "react";
import EnquireButton from "./EnquireButton";
import WishlistButton from "./WishlistButton";

/**
 * Phone-only bar that keeps Enquire reachable once the real one scrolls away.
 *
 * On a product page the description, specs, reviews and related items all sit
 * below the button, so on a phone the only action this whole site has is off
 * screen for most of the page. Usability research on the equivalent pattern
 * (sticky add-to-cart) consistently finds a mid-single-digit to low-double-digit
 * lift in exactly this situation.
 *
 * It watches the real button rather than a scroll offset, so it appears exactly
 * when the button is gone and never covers it — and it disappears again when
 * you scroll back up to it.
 */
export default function StickyEnquireBar({
  watchId,
  productId,
  productName,
  productSlug,
  priceLabel,
  waHref,
}: {
  /** id of the element to watch — the real Enquire button's wrapper. */
  watchId: string;
  productId: string;
  productName: string;
  productSlug: string;
  priceLabel: string;
  waHref: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;

    // A scroll listener rather than an IntersectionObserver, deliberately.
    // The observer only fires when intersection *changes*, so jumping straight
    // past the button — an anchor link, a restored scroll position, a fast
    // flick — never fires it at all and the bar silently never appears. Both
    // earlier attempts here failed exactly that way.
    let queued = false;
    const measure = () => {
      queued = false;
      // Bottom above the viewport: the real button is behind you, not merely
      // further down the page.
      setShown(target.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [watchId]);

  return (
    <div
      // inert rather than aria-hidden: while the bar is off screen its controls
      // must be unreachable by keyboard and screen reader alike, and inert does
      // both. Everything in here duplicates a control further up the page.
      inert={!shown}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 backdrop-blur transition-transform duration-300 lg:hidden ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="shell flex items-center gap-3 py-2.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{productName}</span>
          <span className="block text-sm font-semibold text-rose-600">{priceLabel}</span>
        </span>

        <WishlistButton
          slug={productSlug}
          productName={productName}
          className="shrink-0 border border-line"
        />

        <EnquireButton
          href={waHref}
          productId={productId}
          channel="whatsapp"
          label="Enquire"
          ariaLabel={`Enquire about ${productName} on WhatsApp`}
          className="btn-primary btn-sm shrink-0"
        />
      </div>
    </div>
  );
}
