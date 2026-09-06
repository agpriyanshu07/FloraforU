import Image from "next/image";
import { InstagramIcon } from "./icons";
import { withUtm } from "@/lib/whatsapp";
import { db } from "@/lib/db";

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
  const reels = await db.galleryItem.findMany({
    where: { visible: true, kind: "reel", NOT: { embedUrl: null } },
    orderBy: { displayOrder: "asc" },
    take: 6,
  });

  const photos = reels.length
    ? []
    : await db.galleryItem.findMany({
        where: { visible: true, kind: "photo" },
        orderBy: { displayOrder: "asc" },
        take: 6,
      });

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
          <InstagramIcon className="h-4 w-4" />
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {photos.map((p) => (
            <li key={p.id} className="card overflow-hidden">
              <a
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-square bg-rose-50"
              >
                {p.imageUrl && (
                  <Image
                    src={p.imageUrl}
                    alt={p.alt || p.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 180px"
                    className="object-cover"
                  />
                )}
              </a>
            </li>
          ))}
        </ul>
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
