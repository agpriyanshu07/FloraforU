import type { PDFFont } from "pdf-lib";

/**
 * Text helpers for the catalogue PDF.
 *
 * They live here rather than in the route because a Next route file may only
 * export its HTTP handlers, and these are worth testing directly: sanitise()
 * in particular has already been the cause of one visible branding defect.
 */

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [];
  const words = sanitise(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let value = sanitise(text);
  while (value.length > 3 && font.widthOfTextAtSize(value, size) > maxWidth) {
    value = value.slice(0, -1);
  }
  // Appended after sanitise(), so it has to be characters sanitise() would
  // itself have allowed — otherwise this one string quietly breaks the rule the
  // rest of the file follows, and only a font change would reveal it.
  return value === sanitise(text) ? value : `${value.slice(0, -1)}...`;
}

/**
 * Narrows text to what the embedded fonts can actually draw.
 *
 * This used to strip everything outside ASCII, because the standard PDF fonts
 * are WinAnsi-encoded and throw on anything else. That was a real defect in
 * the shop's own branding: "Lights & Lighting Décor" was printed as "LIGHTS &
 * LIGHTING DCOR" at the head of all 53 pages of that category. The embedded
 * Playfair and Inter subsets carry Latin-1 and Latin Extended-A, so accents
 * now survive.
 *
 * The rupee sign is still spelled out. It sits at U+20B9, well outside those
 * subsets, and pdf-lib throws at draw time rather than at embed time — so a
 * missing glyph would surface as a 500 on a download rather than as a wrong
 * character. Anything else beyond Latin Extended-A is dropped for the same
 * reason: a catalogue with a character missing beats one that will not open.
 *
 * The punctuation map above is not cosmetic. En and em dashes, curly quotes
 * and the multiplication sign all sit above U+017F, so without it the final
 * filter would delete them silently and the shop's own hours would print as
 * "Mon  Sat, 10:00 AM  8:00 PM". Mapping them to their ASCII equivalents keeps
 * the text readable instead.
 */
export function sanitise(text: string): string {
  return text
    .replace(/₹/g, "Rs ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00d7/g, "x")
    .replace(/…/g, "...")
    .replace(/[^\u0020-\u017F]/g, "");
}
