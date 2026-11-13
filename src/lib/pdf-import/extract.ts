/**
 * Reads a catalogue PDF in the browser: each page's text, a small picture of
 * the whole page, and the product photographs embedded in it.
 *
 * It runs in the browser on purpose. A catalogue with its photographs is
 * routinely tens of megabytes, a serverless request body is capped at 4.5 MB,
 * and decoding hundreds of photographs on the server is exactly the CPU bill
 * that paused this site on 30 Oct 2026. The admin's own machine does that work
 * for free, and only the results -- a few hundred KB a page -- leave it.
 *
 * Which embedded images are the product, by elimination -- ported from
 * scripts/catalogue-pdf-extract.py, which picked the photos for the first 590
 * products and was checked by hand against every one of them:
 *
 *   - an image that appears on more than one page is the border or a motif;
 *   - an image placed twice on one page is a decorative spray, unless removing
 *     it leaves the page with no photo at all;
 *   - an image the size and shape of the page is the page's background;
 *   - the shop's flower-bag motif, matched by shape so that it is caught even
 *     when redrawn on a different background;
 *   - and, new here, an image drawn smaller than 3% of the page, which is an
 *     icon (WhatsApp logo, phone glyph), never a product.
 *
 * Whatever survives is the product, largest first. All the rules are about how
 * an image is used rather than what it shows, so they hold on catalogues this
 * code has never seen.
 */

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

export type ExtractedPage = {
  page: number;
  /** The page's text, one visual line per line, top to bottom. */
  text: string;
  /** A small JPEG of the whole page, for reading layout and context. */
  preview: Blob;
  /** Candidate product photographs, largest first. WebP, alpha kept. */
  photos: Blob[];
};

const MOTIF_HASHES = ["00b2f070b2b00010", "04b0f072b2b20030"].map(hexBits);
const MOTIF_CUTOFF = 8;
const MIN_PAGE_SHARE = 0.03;
const MAX_PHOTOS = 14;
const PHOTO_LONG_EDGE = 1600;
const PREVIEW_WIDTH = 1000;

type Placed = { key: string; area: number; image: Drawable; w: number; h: number };
type Drawable = ImageBitmap | HTMLCanvasElement;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    return pdfjs;
  });
  return pdfjsPromise;
}

export async function openPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs();
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

/** Pass 1: which images appear on more than one page. */
export async function findSharedImages(
  doc: PDFDocumentProxy,
  onPage?: (n: number) => void,
): Promise<Set<string>> {
  const pagesSeen = new Map<string, number>();
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const keys = new Set((await placedImages(page)).map((p) => p.key));
    for (const k of keys) pagesSeen.set(k, (pagesSeen.get(k) ?? 0) + 1);
    page.cleanup();
    onPage?.(n);
  }
  return new Set([...pagesSeen].filter(([, c]) => c > 1).map(([k]) => k));
}

/** Pass 2: one page, read. */
export async function extractPage(
  doc: PDFDocumentProxy,
  n: number,
  shared: Set<string>,
): Promise<ExtractedPage> {
  const page = await doc.getPage(n);
  const [text, preview, placed] = await Promise.all([
    pageText(page),
    renderPreview(page),
    placedImages(page),
  ]);
  const view = page.view;
  const pageW = view[2] - view[0];
  const pageH = view[3] - view[1];
  const pageArea = pageW * pageH;

  const timesOnPage = new Map<string, number>();
  for (const p of placed) timesOnPage.set(p.key, (timesOnPage.get(p.key) ?? 0) + 1);

  const usable = placed.filter((p) => {
    if (shared.has(p.key)) return false;
    if (p.area < pageArea * MIN_PAGE_SHARE) return false;
    const coversPage = p.area > pageArea * 0.85;
    const pageShaped = Math.abs(p.w / p.h - pageW / pageH) < 0.02 && p.w * p.h > 1_000_000;
    if (coversPage || pageShaped) return false;
    if (isMotif(p.image)) return false;
    return true;
  });

  let chosen = usable.filter((p) => (timesOnPage.get(p.key) ?? 0) < 2);
  // Some layouts print the product photo twice on its own page. Stripping
  // decoration must never strip everything: a duplicated photo beats none.
  if (chosen.length === 0) chosen = usable;

  const unique = new Map<string, Placed>();
  for (const p of chosen.sort((a, b) => b.area - a.area)) {
    if (!unique.has(p.key)) unique.set(p.key, p);
  }
  const photos: Blob[] = [];
  for (const p of [...unique.values()].slice(0, MAX_PHOTOS)) {
    photos.push(await toWebp(p.image, p.w, p.h));
  }
  page.cleanup();
  return { page: n, text, preview, photos };
}

// --------------------------------------------------------------- internals ---

async function pageText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  type Item = { str: string; y: number; x: number };
  const items: Item[] = [];
  for (const it of content.items) {
    if (!("str" in it) || !it.str.trim()) continue;
    items.push({ str: it.str, x: it.transform[4], y: it.transform[5] });
  }
  // Same baseline, give or take, is the same line; PDF y runs bottom-up.
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Item[][] = [];
  for (const it of items) {
    const line = lines.at(-1);
    if (line && Math.abs(line[0].y - it.y) < 3) line.push(it);
    else lines.push([it]);
  }
  return lines
    .map((l) => l.sort((a, b) => a.x - b.x).map((i) => i.str.trim()).join(" "))
    .join("\n");
}

async function renderPreview(page: PDFPageProxy): Promise<Blob> {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: PREVIEW_WIDTH / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return blobOf(canvas, "image/jpeg", 0.72);
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
function mul(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}
/** Area on the page of the unit square an image is painted into. */
function placedArea(m: Matrix): number {
  return Math.abs(m[0] * m[3] - m[1] * m[2]);
}

async function placedImages(page: PDFPageProxy): Promise<Placed[]> {
  const pdfjs = await loadPdfjs();
  const { OPS } = pdfjs;
  const list = await page.getOperatorList();
  const out: Placed[] = [];
  const stack: Matrix[] = [];
  let ctm: Matrix = IDENTITY;

  for (let i = 0; i < list.fnArray.length; i++) {
    const fn = list.fnArray[i];
    const args = list.argsArray[i] as unknown[];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? IDENTITY;
    else if (fn === OPS.transform) ctm = mul(ctm, args as Matrix);
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      if (Array.isArray(args[0])) ctm = mul(ctm, args[0] as Matrix);
    } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? IDENTITY;
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
      const data =
        fn === OPS.paintImageXObject ? await imageObject(page, args[0] as string) : args[0];
      const image = await toDrawable(data);
      if (!image) continue;
      out.push({ ...image, key: await fingerprint(image.image, image.w, image.h), area: placedArea(ctm) });
    }
    // paintImageXObjectRepeat is a tiled pattern and paintImageMaskXObject a
    // one-colour stencil: neither is ever a product photograph.
  }
  return out;
}

function imageObject(page: PDFPageProxy, id: string): Promise<unknown> {
  const store = id.startsWith("g_") ? page.commonObjs : page.objs;
  return new Promise((resolve) => store.get(id, resolve));
}

async function toDrawable(
  data: unknown,
): Promise<{ image: Drawable; w: number; h: number } | null> {
  const d = data as { bitmap?: ImageBitmap; data?: Uint8ClampedArray; width?: number; height?: number; kind?: number } | null;
  if (!d || !d.width || !d.height) return null;
  if (d.bitmap) return { image: d.bitmap, w: d.width, h: d.height };
  if (!d.data) return null;
  const canvas = document.createElement("canvas");
  canvas.width = d.width;
  canvas.height = d.height;
  const ctx = canvas.getContext("2d")!;
  const px = d.width * d.height;
  const rgba = new Uint8ClampedArray(px * 4);
  // kind 1: 1bpp grayscale, 2: RGB 24bpp, 3: RGBA 32bpp.
  if (d.kind === 3 || d.data.length === px * 4) rgba.set(d.data);
  else if (d.kind === 2 || d.data.length === px * 3) {
    for (let p = 0, q = 0; p < px; p++, q += 3) {
      rgba.set([d.data[q], d.data[q + 1], d.data[q + 2], 255], p * 4);
    }
  } else return null;
  ctx.putImageData(new ImageData(rgba, d.width, d.height), 0, 0);
  return { image: canvas, w: d.width, h: d.height };
}

function draw(image: Drawable, w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, w, h);
  return ctx;
}

/** Same picture => same key, whatever object or page it came from. */
async function fingerprint(image: Drawable, w: number, h: number): Promise<string> {
  const px = draw(image, 16, 16).getImageData(0, 0, 16, 16).data;
  const digest = await crypto.subtle.digest("SHA-1", px);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${w}x${h}:${hex}`;
}

/** Row-wise difference hash, as in the Python extractor: 64 bits, MSB first. */
function dhash(image: Drawable): number[] {
  const px = draw(image, 9, 8).getImageData(0, 0, 9, 8).data;
  const lum = (i: number) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  const bits: number[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const a = (r * 9 + c) * 4;
      bits.push(lum(a) < lum(a + 4) ? 1 : 0);
    }
  }
  return bits;
}
function hexBits(hex: string): number[] {
  return [...hex].flatMap((ch) => {
    const v = parseInt(ch, 16);
    return [8, 4, 2, 1].map((m) => (v & m ? 1 : 0));
  });
}
function isMotif(image: Drawable): boolean {
  const h = dhash(image);
  return MOTIF_HASHES.some((k) => k.reduce((n, bit, i) => n + (bit !== h[i] ? 1 : 0), 0) <= MOTIF_CUTOFF);
}

async function toWebp(image: Drawable, w: number, h: number): Promise<Blob> {
  const s = Math.min(1, PHOTO_LONG_EDGE / Math.max(w, h));
  const ctx = draw(image, Math.round(w * s), Math.round(h * s));
  return blobOf(ctx.canvas, "image/webp", 0.9);
}

function blobOf(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), type, quality),
  );
}
