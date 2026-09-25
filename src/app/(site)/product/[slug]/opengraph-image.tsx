import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { cloudinaryTransform, isCloudinaryUrl } from "@/lib/image";
import { formatPrice } from "@/lib/format";
import { pricingFor } from "@/lib/pricing";
import { getActiveOfferTerms } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { OG_SIZE, PALETTE, bloom } from "@/lib/og";

export const alt = "Product at FloralforU";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * The preview card for a single product — the one that matters, because a
 * product link is what actually gets forwarded on WhatsApp.
 *
 * The photo is embedded only when it is a raster image. Satori cannot lay out
 * an SVG `<img>`, and every product on the site is still carrying an SVG
 * placeholder, so embedding blindly would fail the whole card rather than one
 * corner of it. Until the real photography lands these render as a typographic
 * card, which is the honest version of "no photo yet".
 *
 * The price shown is the one the shopper will actually be quoted: if a campaign
 * is live, it is the sale price with the original struck through, exactly as
 * the page itself shows it. A preview quoting the pre-sale price would be an
 * advert for the wrong number.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [product, terms, s] = await Promise.all([
    db.product.findUnique({
      where: { slug },
      include: { category: true, images: { take: 1, orderBy: { position: "asc" } } },
    }),
    getActiveOfferTerms(),
    getSettings(),
  ]);

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: PALETTE.cream,
            color: PALETTE.rose,
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          {s.businessName}
        </div>
      ),
      size,
    );
  }

  const pricing = pricingFor(product.price, product.priceOnEnquiry, terms.get(product.id));
  const src = await photoFor(product.images[0]?.url);

  return (
    new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: PALETTE.cream,
            position: "relative",
          }}
        >
          {!src && bloom({ x: 1010, y: 150, r: 170, colour: PALETTE.marigold, opacity: 0.2 })}
          {!src && bloom({ x: 1120, y: 470, r: 120, colour: PALETTE.rose, opacity: 0.14 })}

          {src && (
            <div style={{ display: "flex", width: 480, height: "100%" }}>
              {/* A plain <img>: this renders inside Satori, which knows nothing
                  about next/image. */}
              <img src={src} alt="" width={480} height={630} style={{ objectFit: "cover" }} />
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              padding: "56px 60px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  letterSpacing: 5,
                  color: PALETTE.ink600,
                  textTransform: "uppercase",
                }}
              >
                {product.category.name}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: src ? 58 : 76,
                  fontWeight: 700,
                  color: PALETTE.ink900,
                  marginTop: 16,
                  lineHeight: 1.15,
                }}
              >
                {product.name}
              </div>
              {product.spec && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    color: PALETTE.ink600,
                    marginTop: 18,
                    lineHeight: 1.35,
                  }}
                >
                  {product.spec}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                {pricing.percentOff !== null && (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 34,
                      color: "#b91c1c",
                      textDecoration: "line-through",
                    }}
                  >
                    {pricing.originalLabel}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    fontSize: 58,
                    fontWeight: 700,
                    color: PALETTE.rose,
                  }}
                >
                  {pricing.currentLabel || formatPrice(product.price, product.priceOnEnquiry)}
                </div>
                {pricing.percentOff !== null && (
                  <div
                    style={{
                      display: "flex",
                      background: "#b91c1c",
                      color: "#ffffff",
                      fontSize: 26,
                      fontWeight: 600,
                      padding: "8px 16px",
                      borderRadius: 8,
                    }}
                  >
                    {pricing.percentOff}% off
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginTop: 30,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    background: PALETTE.whatsapp,
                    color: "#ffffff",
                    fontSize: 24,
                    fontWeight: 600,
                    padding: "13px 26px",
                    borderRadius: 999,
                  }}
                >
                  Enquire on WhatsApp
                </div>
                <div style={{ display: "flex", fontSize: 24, color: PALETTE.ink600 }}>
                  {s.businessName} · {s.city}
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      size,
    )
  );
}

/**
 * The photo to draw into the card, or null to fall back to the typographic
 * layout. Three cases, and the awkward ones are the point:
 *
 * - SVG is dropped. Satori cannot lay out an SVG `<img>`, and every product is
 *   still on an SVG placeholder, so embedding blindly fails the whole card.
 * - A remote URL is used as-is (asking Cloudinary for a card-sized version
 *   rather than the original, which can be several megabytes).
 * - A local path under public/ is inlined as a data URI. Satori has no origin
 *   to resolve "/img/products/x.jpg" against, so a local upload would silently
 *   render nothing otherwise.
 */
async function photoFor(url: string | undefined): Promise<string | null> {
  if (!url || url.toLowerCase().endsWith(".svg")) return null;

  if (/^https?:\/\//i.test(url)) {
    return isCloudinaryUrl(url) ? cloudinaryTransform(url, 700) : url;
  }

  const root = join(process.cwd(), "public");
  const file = normalize(join(root, url));
  // The path comes from the database, so it is only as trustworthy as the admin
  // form and any spreadsheet imported through it: keep it inside public/.
  if (!file.startsWith(root + sep)) return null;

  const type = MIME[extname(file).toLowerCase()];
  if (!type) return null;

  try {
    const bytes = await readFile(file);
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    // A path pointing at a file that is not there is a broken photo, not a
    // broken share card.
    return null;
  }
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};
