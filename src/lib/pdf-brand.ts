import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * The shop's typefaces and logo, in the formats pdf-lib can take.
 *
 * The site loads Playfair Display and Inter through next/font/google, which
 * produces .woff2 — a format pdf-lib cannot embed. Standard Helvetica was
 * standing in, which is why the catalogue looked like a generic export rather
 * than like the shop. The four faces are vendored as TTF in assets/fonts (see
 * the README there for how they were made and their licence).
 *
 * The logo is an SVG painted with `fill="currentColor"`, so rasterising it as
 * it stands gives a black mark or nothing at all. The colour has to be
 * substituted before sharp ever sees it, which is why this takes one.
 */

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const LOGO = path.join(process.cwd(), "public", "img", "brand", "logo-ffu.svg");

export type BrandFonts = {
  displayRegular: Buffer;
  displayBold: Buffer;
  sansRegular: Buffer;
  sansBold: Buffer;
};

let fonts: Promise<BrandFonts> | null = null;

/** Read once per server instance: the same bytes on every request. */
export function brandFonts(): Promise<BrandFonts> {
  fonts ??= (async () => {
    const [displayRegular, displayBold, sansRegular, sansBold] = await Promise.all([
      readFile(path.join(FONT_DIR, "PlayfairDisplay-Regular.ttf")),
      readFile(path.join(FONT_DIR, "PlayfairDisplay-Bold.ttf")),
      readFile(path.join(FONT_DIR, "Inter-Regular.ttf")),
      readFile(path.join(FONT_DIR, "Inter-SemiBold.ttf")),
    ]);
    return { displayRegular, displayBold, sansRegular, sansBold };
  })();
  return fonts;
}

const logos = new Map<string, Promise<Buffer | null>>();

/**
 * The logo as PNG, in one colour, at one width.
 *
 * PNG rather than JPEG because the mark has to sit on a rose band and on cream
 * without a box around it, and JPEG has no transparency.
 *
 * Returns null rather than throwing: a catalogue missing its logo is a lesser
 * failure than a catalogue that does not generate.
 */
export function brandLogoPng(color: string, width: number): Promise<Buffer | null> {
  const key = `${color}@${width}`;
  let hit = logos.get(key);
  if (!hit) {
    hit = (async () => {
      try {
        const svg = await readFile(LOGO, "utf8");
        // `currentColor` inherits from CSS, which does not exist here.
        const painted = svg.replaceAll("currentColor", color);
        return await sharp(Buffer.from(painted), { density: 384 })
          .resize({ width, withoutEnlargement: false })
          .png()
          .toBuffer();
      } catch {
        return null;
      }
    })();
    logos.set(key, hit);
  }
  return hit;
}

/** The palette, straight from src/app/globals.css. */
export const BRAND = {
  rose600: "#9b2c5a",
  rose700: "#7d2148",
  rose100: "#fbedf2",
  rose50: "#fdf5f8",
  marigold600: "#b45309",
  ink900: "#2a1d22",
  ink600: "#6b5a61",
  cream: "#fffbf7",
  line: "#ede0e4",
} as const;
