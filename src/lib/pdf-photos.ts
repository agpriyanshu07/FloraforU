import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Turns a product image URL into JPEG bytes pdf-lib can embed.
 *
 * pdf-lib embeds PNG and JPEG and nothing else, and every photo in this
 * catalogue is .webp — so a conversion step is not optional, it is the whole
 * reason this file exists.
 *
 * Three things here are load-bearing and easy to lose:
 *
 *  * `flatten` to white. Many of the shop's photos are cut-outs with an alpha
 *    channel, and JPEG has no alpha. Without this, sharp composites the
 *    transparent areas onto BLACK, so every cut-out pot arrives in the PDF on
 *    a black square.
 *  * `withoutEnlargement`. The source photos run from 112px to 1280px wide
 *    (median 577). Upscaling the small ones to a uniform width would make a
 *    112px photo look worse, not better, and cost bytes doing it.
 *  * the cache. The catalogue PDF is 590 pages of photographs; regenerating
 *    every one on every download would make the route pay ~12s of image
 *    decoding each time instead of once per warm instance.
 */

/** Long edge of the main photo on a product page, in pixels. */
export const PHOTO_EDGE = 600;
/** Long edge of the small extra photos under it. */
export const THUMB_EDGE = 220;

const FETCH_TIMEOUT_MS = 5000;

/**
 * Bounded so a shop that keeps adding photos cannot grow this without limit
 * inside a long-lived server process. 1200 entries of ~3KB is a few MB.
 */
const MAX_ENTRIES = 1200;
const cache = new Map<string, Buffer | null>();

function remember(key: string, value: Buffer | null): Buffer | null {
  if (cache.size >= MAX_ENTRIES) {
    // Oldest first. Map iterates in insertion order, so this is a plain FIFO —
    // good enough for a cache whose whole job is to survive one request.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Reads a local image out of /public, refusing anything that escapes it. */
async function readLocal(url: string): Promise<Buffer | null> {
  // Query strings and fragments are legal in an <img src> and are not part of
  // the path on disk.
  const clean = url.split(/[?#]/)[0];
  const resolved = path.resolve(PUBLIC_DIR, "." + decodeURIComponent(clean));
  // A product's image URL is admin-entered text, so it is not automatically
  // trustworthy: "/../../etc/passwd" has to fail here rather than be read.
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) return null;
  try {
    return await readFile(resolved);
  } catch {
    return null;
  }
}

async function readRemote(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * JPEG bytes for one image, or null if it cannot be used.
 *
 * Null is a normal answer, not an error: a product whose photo is missing,
 * unreadable or times out still belongs in the catalogue, and the page draws a
 * "Photo coming soon" panel in its place. A catalogue that 500s because one
 * image is broken would be far worse than one with a gap in it.
 */
export async function photoJpeg(url: string, edge = PHOTO_EDGE): Promise<Buffer | null> {
  const key = `${edge}:${url}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const source = /^https?:\/\//i.test(url)
    ? await readRemote(url)
    : url.startsWith("/")
      ? await readLocal(url)
      : null;
  if (!source) return remember(key, null);

  try {
    const jpeg = await sharp(source)
      .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
    return remember(key, jpeg);
  } catch {
    return remember(key, null);
  }
}

/** Resolves many images at once, a few at a time. */
export async function photoJpegs(
  requests: { url: string; edge?: number }[],
): Promise<Map<string, Buffer | null>> {
  const out = new Map<string, Buffer | null>();
  // Eight at a time. One at a time takes about a minute for the full
  // catalogue; unbounded spawns 920 sharp pipelines at once and the memory
  // spike is what kills a small serverless instance.
  const CONCURRENCY = 8;
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < requests.length) {
        const { url, edge = PHOTO_EDGE } = requests[next++];
        const key = `${edge}:${url}`;
        if (out.has(key)) continue;
        out.set(key, await photoJpeg(url, edge));
      }
    }),
  );
  return out;
}
