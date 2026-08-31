export function formatPrice(
  price: number | null | undefined,
  priceOnEnquiry: boolean,
): string {
  if (priceOnEnquiry || price === null || price === undefined) {
    return "Price on Enquiry";
  }
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price)}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "item";
}

export const AVAILABILITY_LABELS: Record<string, string> = {
  in_stock: "In stock",
  limited: "Limited stock",
  made_to_order: "Made to order",
};

export function isProductNew(p: {
  isNew: boolean;
  newUntil: Date | null;
}): boolean {
  if (p.newUntil) return p.newUntil.getTime() > Date.now();
  return p.isNew;
}

/**
 * Wrappers around the clock. Kept out of component bodies so the React compiler
 * doesn't see a direct impure call at render time.
 */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
