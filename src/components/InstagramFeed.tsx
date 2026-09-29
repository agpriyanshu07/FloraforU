import { InstagramColorIcon } from "./icons";
import { withUtm } from "@/lib/whatsapp";
import { db } from "@/lib/db";
import { INSTAGRAM_FALLBACK } from "@/lib/photo-fallback";
import { stripSelection } from "@/lib/instagram-strip";
import PhotoLightbox, { type LightboxPhoto } from "./PhotoLightbox";

/**
 * Instagram section.
 *
 * When the shop owner pastes real post/reel permalinks into Admin → Gallery
 * (kind = "reel"), those render as official Instagram embeds via
 * instagram.com/embed — no third-party widget, no API token to expire.
 *
 * With none configured yet, this falls back to the site's own curated gallery
 * images plus a live profile link. That is a working section, deliberately not
 * the "Instagram feed will display here once connected" dead placeholder the
 * reference site ships.
 */
export default async function InstagramFeed({
  instagramUrl,
  handle,
}: {
  instagramUrl: string;
  handle: string;
}) {
  // One query, then the shared selector in src/lib/instagram-strip.ts decides
  // what runs. The rules used to live here alone, which let Admin → Instagram
  // label rows "Live" that this never drew.
  const rows = await db.galleryItem.findMany({ orderBy: { displayOrder: "asc" } });
  const selected = stripSelection(rows);
  const reels = selected.filter((r) => r.kind === "reel");
  const stored = selected.filter((r) => r.kind === "photo");

  // Photos the shop sent but could not upload, because Cloudinary is not
  // configured yet, are committed to the repo instead. They show only while
  // the gallery holds nothing real of its own, so a reel or an uploaded photo
  // added later replaces them without this being touched.
  const source = reels.length > 0 || stored.length > 0 ? stored : [...INSTAGRAM_FALLBACK];

  const photos: LightboxPhoto[] = source
    .filter((p): p is typeof p & { imageUrl: string } => Boolean(p.imageUrl))
    .map((p) => ({
      id: p.id,
      url: p.imageUrl,
      alt: ("alt" in p ? p.alt : null) || p.title,
    }));

  const profileHref = withUtm(instagramUrl, "website", "instagram-section");

  return (
    <section aria-labelledby="instagram-heading" className="shell py-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="instagram-heading" className="font-display text-3xl">
            Follow {handle}
          </h2>
          <p className="mt-1 text-ink-600">
            New arrivals, event setups and dispatch updates go up on Instagram first.
          </p>
        </div>
        <a href={profileHref} target="_blank" rel="noopener noreferrer" className="btn-instagram">
          <InstagramColorIcon className="h-4 w-4" />
          Open Instagram
        </a>
      </div>

      {reels.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reels.map((r) => (
            <li key={r.id} className="card overflow-hidden">
              <iframe
                src={`${r.embedUrl!.replace(/\/$/, "")}/embed`}
                title={r.title || `Instagram post from ${handle}`}
                loading="lazy"
                className="aspect-[4/5] w-full border-0"
                allowFullScreen
              />
            </li>
          ))}
        </ul>
      ) : photos.length > 0 ? (
        // Small tiles, six across on a wide screen. The photographs are only
        // 335px wide, so anything larger was upscaling them into softness --
        // at this size the browser scales them DOWN, which is sharp.
        //
        // The 4:5 tile still crops a 9:16 reel frame, so a caption sitting at
        // the very bottom is clipped. That was worth avoiding when the tile
        // was the only way to see a photo; it is not now, because tapping one
        // opens the whole frame in place.
        <PhotoLightbox photos={photos} />
      ) : (
        // Nothing to show yet: an empty grid would read as a broken section, so
        // point people at the live profile instead.
        <p className="card px-6 py-10 text-center text-ink-600">
          Our latest posts are on Instagram.{" "}
          <a
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-rose-600 hover:text-rose-700"
          >
            Follow {handle}
          </a>{" "}
          to see new arrivals, event setups and dispatch updates first.
        </p>
      )}
    </section>
  );
}
