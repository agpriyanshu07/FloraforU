/**
 * Campaign themes and countdown urgency — the single source of truth for how a
 * sale looks, so four campaigns can't drift into four ad hoc styles over time.
 *
 * Every colour below was contrast-checked the same way the base palette in
 * globals.css was, and the measured ratio is noted. White body text sits on the
 * `bg` of each theme; the urgency badges deliberately invert to a light chip so
 * they stay legible on all four backgrounds rather than only on marigold.
 */

export type OfferThemeName =
  | "marigold"
  | "festive-red"
  | "monsoon-blue"
  | "midnight-gold";

export type OfferTheme = {
  name: OfferThemeName;
  label: string;
  /** Ribbon/strip background. White text sits on this. */
  bg: string;
  /** Nested chip inside the ribbon, for the calm countdown state. */
  chip: string;
  /** Text colour for the "View offers" button that sits on cream. */
  onCream: string;
  /** Button background when placed on the themed ribbon (light on dark). */
  buttonText: string;
};

export const OFFER_THEMES: Record<OfferThemeName, OfferTheme> = {
  // The existing marigold accent, unchanged — every pre-existing offer row
  // defaults to this, so nothing already published shifts appearance.
  marigold: {
    name: "marigold",
    label: "Marigold (default)",
    bg: "bg-marigold-600", // 5.02:1 with white
    chip: "bg-marigold-700",
    onCream: "text-marigold-700",
    buttonText: "text-marigold-700",
  },
  "festive-red": {
    name: "festive-red",
    label: "Festive red (Diwali, weddings)",
    bg: "bg-festive-600", // 6.54:1 with white
    chip: "bg-festive-700",
    onCream: "text-festive-700",
    buttonText: "text-festive-700",
  },
  "monsoon-blue": {
    name: "monsoon-blue",
    label: "Monsoon blue (clearance)",
    bg: "bg-monsoon-600", // 7.96:1 with white
    chip: "bg-monsoon-700",
    onCream: "text-monsoon-700",
    buttonText: "text-monsoon-700",
  },
  "midnight-gold": {
    name: "midnight-gold",
    label: "Midnight gold (premium)",
    bg: "bg-midnight-600", // 12.56:1 with white
    chip: "bg-midnight-700",
    onCream: "text-midnight-700",
    buttonText: "text-midnight-700",
  },
};

export const OFFER_THEME_NAMES = Object.keys(OFFER_THEMES) as OfferThemeName[];

/** Unknown/legacy theme strings fall back to marigold rather than crashing. */
export function offerTheme(name: string | null | undefined): OfferTheme {
  return OFFER_THEMES[(name ?? "") as OfferThemeName] ?? OFFER_THEMES.marigold;
}

// ------------------------------------------------------------------ urgency

export type UrgencyLevel = "calm" | "urgent" | "critical";

/** Below this many hours the countdown goes to its loudest state. */
export const CRITICAL_WITHIN_HOURS = 6;

/**
 * Pure so both the server (first paint) and the client (ticking) derive the
 * same level from the same inputs — no hydration drift.
 */
export function urgencyLevel(
  msRemaining: number,
  urgentWithinHours: number,
): UrgencyLevel {
  if (msRemaining <= CRITICAL_WITHIN_HOURS * 3_600_000) return "critical";
  if (msRemaining <= urgentWithinHours * 3_600_000) return "urgent";
  return "calm";
}
