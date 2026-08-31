import type { Metadata } from "next";
import Image from "next/image";
import EmptyState from "@/components/EmptyState";
import { BoxIcon } from "@/components/icons";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our work & dispatch",
  description:
    "Real FloralforU event setups and real dispatch photos — see how orders are packed and what actually turns up at your venue.",
};

const GROUPS = [
  {
    tag: "event",
    title: "Event setups",
    blurb:
      "Stages, mandaps, haldi corners and showroom displays built with items from this catalogue.",
  },
  {
    tag: "dispatch",
    title: "Packed & dispatched",
    blurb:
      "Every outstation order is photographed before it leaves the shop, so you know exactly what was sent and how it was packed.",
  },
  {
    tag: "shop",
    title: "At the shop",
    blurb: "Come see it in person at Bank More, Dhanbad.",
  },
];

export default async function GalleryPage() {
  const items = await db.galleryItem.findMany({
    where: { visible: true },
    orderBy: { displayOrder: "asc" },
  });

  const reels = items.filter((i) => i.kind === "reel" && i.embedUrl);

  return (
    <div className="shell py-10">
      <header className="mb-8 max-w-3xl">
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)]">
          Our work &amp; dispatch
        </h1>
        <p className="mt-2 text-ink-600">
          Photos of finished setups and of orders packed for delivery. If
          you&apos;re ordering from outside Dhanbad, this is what you can expect.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="Gallery coming soon"
          body="Photos of our event setups and dispatch runs will appear here as we add them from the admin portal."
          actionLabel="Browse the catalogue"
          actionHref="/catalogue"
          icon={<BoxIcon className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-14">
          {GROUPS.map((group) => {
            const groupItems = items.filter(
              (i) => i.tag === group.tag && i.kind === "photo",
            );
            if (groupItems.length === 0) return null;

            return (
              <section key={group.tag} aria-labelledby={`group-${group.tag}`}>
                <h2 id={`group-${group.tag}`} className="font-display text-2xl">
                  {group.title}
                </h2>
                <p className="mt-1 max-w-2xl text-ink-600">{group.blurb}</p>
                <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {groupItems.map((item) => (
                    <li key={item.id} className="card overflow-hidden">
                      <figure>
                        <div className="relative aspect-square bg-rose-50">
                          {item.imageUrl && (
                            <Image
                              src={item.imageUrl}
                              alt={item.alt || item.title}
                              fill
                              sizes="(max-width: 640px) 50vw, 280px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <figcaption className="p-3 text-[13px] text-ink-600">
                          {item.title}
                        </figcaption>
                      </figure>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {reels.length > 0 && (
            <section aria-labelledby="reels-heading">
              <h2 id="reels-heading" className="font-display text-2xl">
                Reels
              </h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reels.map((r) => (
                  <li key={r.id} className="card overflow-hidden">
                    <iframe
                      src={`${r.embedUrl!.replace(/\/$/, "")}/embed`}
                      title={r.title}
                      loading="lazy"
                      className="aspect-[4/5] w-full border-0"
                      allowFullScreen
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
