"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades and lifts its children into place the first time they scroll into view.
 *
 * The hidden starting state is applied on mount, never in the server HTML, so
 * the content is visible to anyone whose JavaScript never runs — a reveal
 * effect that can hide the page's actual content when a bundle fails is a bad
 * trade for a bit of polish.
 *
 * Reduced motion skips the whole thing rather than shortening it: the point of
 * the setting is no movement, not faster movement.
 */
export default function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** Stagger for lists, so cards arrive in sequence rather than together. */
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = ref.current;
    if (!el) return;

    // Already on screen at mount (above the fold): show it without animating in,
    // so the first paint isn't a flash of content sliding under the reader.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return;

    setArmed(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${armed ? "ffu-reveal" : ""} ${shown ? "ffu-reveal-in" : ""}`}
      style={armed && delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
