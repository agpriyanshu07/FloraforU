"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown for a named offer campaign. Rendered client-side only after
 * mount so the server HTML and first client render agree (no hydration drift),
 * with a static "Ends <date>" as the pre-hydration content.
 */
export default function Countdown({
  endsAt,
  fallback,
}: {
  endsAt: string;
  fallback: string;
}) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setLabel("Offer ended");
        return;
      }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLabel(d > 0 ? `Ends in ${d}d ${h}h ${m}m` : `Ends in ${h}h ${m}m ${s}s`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <span suppressHydrationWarning aria-live="off">
      {label ?? fallback}
    </span>
  );
}
