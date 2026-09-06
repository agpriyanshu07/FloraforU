"use client";

import { useEffect, useState } from "react";
import { ArrowRightIcon } from "./icons";

/**
 * Back to the top of a long list.
 *
 * The catalogue runs to 97 products over five pages and the category pages are
 * long too; on a phone that is a lot of thumb to get back to the filters. Only
 * appears once there is enough page behind you to be worth it.
 *
 * Sits above the sticky enquire bar's height on product pages so the two never
 * overlap.
 */
export default function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Passive: this must never delay a scroll.
    const onScroll = () => setShown(window.scrollY > 1200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    // Return focus to the top of the document, so a keyboard user actually
    // lands where the page just scrolled rather than staying down here.
    document.getElementById("main")?.focus?.();
  }

  return (
    <button
      type="button"
      onClick={toTop}
      inert={!shown}
      className={`fixed bottom-20 right-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-line bg-cream/95 text-ink-900 shadow-lg backdrop-blur transition-all duration-300 hover:bg-white lg:bottom-6 ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowRightIcon className="h-5 w-5 -rotate-90" />
      <span className="sr-only">Back to top</span>
    </button>
  );
}
