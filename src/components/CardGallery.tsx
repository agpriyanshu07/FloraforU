"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { imageProps } from "@/lib/image";
import { ArrowRightIcon } from "./icons";

type CardImage = { url: string; alt: string };

/**
 * The photo on a product card, with arrows when there is more than one.
 *
 * Décor is bought on how it looks, and a lardi or a backdrop usually comes in
 * several colours — flicking through them on the card saves opening four
 * product pages to compare. With a single photo this renders exactly what it
 * rendered before: no controls, no client state worth speaking of.
 *
 * The arrows are real buttons rather than swipe-only, because the card sits
 * inside a link and a swipe there is ambiguous — it could equally mean "scroll
 * the page".
 *
 * They are also rendered only once this has mounted on the client. Server-side
 * they would appear in the markup and sit there dead until React attaches its
 * handlers — on a slow connection that is a visible control that does nothing
 * when pressed, which is worse than no control at all. The photo itself, its
 * link and the rest of the card are unaffected and still render on the server.
 */
export default function CardGallery({
  images,
  productName,
  href,
  priority,
}: {
  images: CardImage[];
  productName: string;
  /** The product page. The photo links there, as it did before. */
  href: string;
  priority?: boolean;
}) {
  const [index, setIndex] = useState(0);
  // False while rendering on the server and through hydration, true once this
  // is running on the client — the store never changes, so nothing ever
  // re-subscribes or re-renders after that first pass.
  const interactive = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  const shown = images[Math.min(index, images.length - 1)];

  function step(delta: number, event: React.MouseEvent) {
    // The card is a link; paging photos must not navigate.
    event.preventDefault();
    event.stopPropagation();
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-rose-50">
      {/* The arrows have to be siblings of this link, not inside it: a button
          nested in an anchor is invalid and behaves unpredictably. */}
      <Link href={href} className="absolute inset-0 block" tabIndex={-1} aria-hidden="true">
        {shown ? (
          <Image
            {...imageProps(shown.url, 560)}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-ink-600">
            Photo coming soon
          </span>
        )}
      </Link>

      {interactive && images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => step(-1, e)}
            className="absolute left-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-cream/85 text-ink-900 opacity-0 shadow transition-opacity duration-200 hover:bg-white focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
            <span className="sr-only">Previous photo of {productName}</span>
          </button>
          <button
            type="button"
            onClick={(e) => step(1, e)}
            className="absolute right-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-cream/85 text-ink-900 opacity-0 shadow transition-opacity duration-200 hover:bg-white focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ArrowRightIcon className="h-4 w-4" />
            <span className="sr-only">Next photo of {productName}</span>
          </button>

          <span
            aria-hidden
            className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1"
          >
            {images.map((img, i) => (
              <span
                key={img.url}
                className={`h-1.5 rounded-full bg-white transition-all duration-200 ${
                  i === index ? "w-4 opacity-100" : "w-1.5 opacity-60"
                }`}
              />
            ))}
          </span>

          <span aria-live="polite" className="sr-only">
            Photo {index + 1} of {images.length}
          </span>
        </>
      )}
    </div>
  );
}

const subscribeToNothing = () => () => {};
