import { ReactNode } from "react";

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}

/** New and Offer are stackable — a product can legitimately be both. */
export function NewBadge() {
  return <Pill className="bg-sage-600 text-white">New</Pill>;
}

export function OfferBadge() {
  return <Pill className="bg-marigold-600 text-white">Offer</Pill>;
}

export function CategoryTag({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-600">
      {children}
    </span>
  );
}

/**
 * `short` is for product cards, where this sits opposite the New/Offer badges
 * over a photo about 170px wide on a phone. "Limited stock" and "Made to order"
 * are simply too long for that: the two badge groups ran into each other and
 * overlapped. The full wording stays on the product page, where there is room
 * for it and where the shopper is deciding.
 */
export function AvailabilityTag({
  availability,
  short = false,
}: {
  availability: string;
  short?: boolean;
}) {
  if (availability === "in_stock") return null;
  const limited = availability === "limited";
  const label = short
    ? limited
      ? "Limited"
      : "To order"
    : limited
      ? "Limited stock"
      : "Made to order";
  return <Pill className="bg-ink-900/85 text-white">{label}</Pill>;
}
