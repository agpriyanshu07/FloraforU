/**
 * What the homepage Instagram strip actually renders, decided once.
 *
 * The admin list used to label every visible row "Live". Nine of them were
 * seeded placeholder artwork, which the strip has always skipped — so the
 * admin asserted nine photos were on the homepage while the homepage showed
 * none of them. The rules lived in the component, and the admin guessed.
 *
 * They live here now and both read them, so the admin cannot drift from the
 * site again.
 */

export const MAX_REELS = 6;
export const MAX_PHOTOS = 10;

export type StripRow = {
  id: string;
  kind: string;
  visible: boolean;
  imageUrl: string | null;
  embedUrl: string | null;
};

/**
 * Generated placeholder artwork. It is the only SVG here — a real photo is a
 * webp, a jpg or a URL pasted from somewhere else — and a grid of placeholder
 * tiles under a "Follow us" heading looks worse than the empty state, which at
 * least sends people to the live profile.
 */
export function isPlaceholderArt(url: string | null): boolean {
  return Boolean(url && url.endsWith(".svg"));
}

const isReel = (r: StripRow) => r.kind === "reel" && Boolean(r.embedUrl);
const isPhoto = (r: StripRow) =>
  r.kind === "photo" && Boolean(r.imageUrl) && !isPlaceholderArt(r.imageUrl);

/**
 * The rows the strip draws, in order. Reels win outright: one real reel means
 * the photos wait, which is deliberate — an embed is richer than a still.
 *
 * `rows` is expected in display order. Generic so callers keep their own row
 * type — the component needs the title and alt text this module has no reason
 * to know about.
 */
export function stripSelection<T extends StripRow>(rows: T[]): T[] {
  const reels = rows.filter((r) => r.visible && isReel(r));
  if (reels.length > 0) return reels.slice(0, MAX_REELS);
  return rows.filter((r) => r.visible && isPhoto(r)).slice(0, MAX_PHOTOS);
}

/** Why a row is, or is not, on the homepage — for the admin list to say so. */
export function stripStatus<T extends StripRow>(row: T, rows: T[]): { live: boolean; label: string } {
  if (!row.visible) return { live: false, label: "Hidden" };

  const selected = stripSelection(rows);
  if (selected.some((r) => r.id === row.id)) return { live: true, label: "Live" };

  if (row.kind === "reel" && !row.embedUrl) return { live: false, label: "No link yet" };
  if (row.kind === "photo" && !row.imageUrl) return { live: false, label: "No photo yet" };
  if (isPlaceholderArt(row.imageUrl)) return { live: false, label: "Placeholder art" };
  if (row.kind === "photo" && rows.some((r) => r.visible && isReel(r))) {
    return { live: false, label: "Reels take priority" };
  }
  return { live: false, label: "Over the limit" };
}
