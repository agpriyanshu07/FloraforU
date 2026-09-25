/**
 * Shared chrome for the generated Open Graph cards.
 *
 * Kept in one place so the shop's link preview looks like one shop whichever
 * page was shared, and so the palette cannot drift from the design tokens in
 * globals.css — these are the same values, written as literals because Satori
 * resolves no CSS variables.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const PALETTE = {
  cream: "#fffbf7",
  rose: "#9b2c5a",
  roseDeep: "#7d2148",
  roseSoft: "#fbedf2",
  marigold: "#e8a13c",
  sage: "#6f9472",
  ink900: "#2a1d22",
  ink600: "#6b5a61",
  line: "#ede0e4",
  whatsapp: "#0b7a6e",
} as const;

/** A soft out-of-focus bloom. Decoration only, and cheap: one div. */
export function bloom({
  x,
  y,
  r,
  colour,
  opacity,
}: {
  x: number;
  y: number;
  r: number;
  colour: string;
  opacity: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        background: colour,
        opacity,
      }}
    />
  );
}
