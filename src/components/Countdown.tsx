"use client";

import { useEffect, useState } from "react";
import { ClockIcon } from "./icons";
import { urgencyLevel, type UrgencyLevel } from "@/lib/offers";

/**
 * Live countdown for a named offer campaign. Rendered client-side only after
 * mount so the server HTML and first client render agree (no hydration drift),
 * with a static "Ends <date>" as the pre-hydration content.
 *
 * Three visual states, escalating as the deadline nears: calm (a chip in the
 * campaign's own colour), urgent, then critical in the final hours. The two
 * escalated states invert to a light chip so they stay legible on every
 * campaign background rather than only on the default marigold one.
 */
export default function Countdown({
  endsAt,
  fallback,
  urgentWithinHours = 48,
  chipClass = "bg-marigold-700",
  escalate = false,
}: {
  endsAt: string;
  fallback: string;
  urgentWithinHours?: number;
  /** Calm-state chip colour, supplied by the campaign theme. */
  chipClass?: string;
  /** Opt in to the escalating chip. Off keeps the original inline behaviour. */
  escalate?: boolean;
}) {
  const [label, setLabel] = useState<string | null>(null);
  const [level, setLevel] = useState<UrgencyLevel>("calm");

  useEffect(() => {
    const target = new Date(endsAt).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setLabel("Offer ended");
        setLevel("calm");
        return;
      }
      setLevel(urgencyLevel(diff, urgentWithinHours));

      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLabel(d > 0 ? `Ends in ${d}d ${h}h ${m}m` : `Ends in ${h}h ${m}m ${s}s`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, urgentWithinHours]);

  // Original call sites render this inline inside their own chip; only the new
  // ribbon/offer surfaces opt into the escalating treatment.
  if (!escalate) {
    return (
      <span suppressHydrationWarning aria-live="off">
        {label ?? fallback}
      </span>
    );
  }

  const chip =
    level === "critical"
      ? "bg-white text-[color:var(--color-urgent-red)] motion-safe:animate-[pulse-urgent_1.1s_ease-in-out_infinite]"
      : level === "urgent"
        ? "bg-marigold-100 text-marigold-700 motion-safe:animate-[pulse-urgent_2.4s_ease-in-out_infinite]"
        : `${chipClass} text-white`;

  return (
    <span
      suppressHydrationWarning
      aria-live="off"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[13px] font-semibold ${chip}`}
    >
      {level !== "calm" && <ClockIcon className="h-3.5 w-3.5 shrink-0" />}
      {label ?? fallback}
    </span>
  );
}
