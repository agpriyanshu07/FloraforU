"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { imageProps } from "@/lib/image";

export type LightboxPhoto = { id: string; url: string; alt: string };

/**
 * A grid of photo thumbnails that open full-size in an overlay.
 *
 * Deliberately NOT links. These are the shop's own photographs, and a tile
 * that navigated away to instagram.com meant a customer could not look at one
 * without leaving the site. The "Open Instagram" button beside the heading is
 * the one place that does that, which is where a customer expects it.
 *
 * Sizes are chosen against what the photographs actually hold. The reel
 * frames the shop sent are 335px across, so a six-across grid (182 CSS px,
 * 364 device px on a retina screen) is the widest tile they fill without being
 * stretched -- the old three-across grid asked 760 device px of a 335px file,
 * which is why they looked blurry. The overlay is capped at 360px for the same
 * reason: past that there is simply no more detail in the file to show.
 */
export default function PhotoLightbox({ photos }: { photos: LightboxPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpen((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);

    // The page behind must not scroll while the overlay is up, or a phone
    // drags the photo around underneath a fixed backdrop.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, close, step]);

  const openAt = (i: number, el: HTMLElement) => {
    returnTo.current = el;
    setOpen(i);
  };

  // Focus goes back to the thumbnail that opened the overlay, so keyboard and
  // screen-reader users are not dumped at the top of the page on close.
  useEffect(() => {
    if (open === null) returnTo.current?.focus();
  }, [open]);

  const current = open === null ? null : photos[open];

  return (
    <>
      {/* Wrap-and-centre rather than a fixed grid: with five photos a
          six-column grid left a hole at the end of the row. The widths are
          percentages capped at 182px, which is the widest these files fill on
          a retina screen without being stretched. */}
      <ul className="flex flex-wrap justify-center gap-3">
        {photos.map((p, i) => (
          <li key={p.id} className="w-[30%] max-w-[182px] sm:w-[22%] lg:w-[15%]">
            <button
              type="button"
              onClick={(e) => openAt(i, e.currentTarget)}
              aria-haspopup="dialog"
              aria-label={`Enlarge: ${p.alt}`}
              className="card group relative block aspect-[4/5] w-full overflow-hidden bg-rose-50
                         transition-transform duration-200 hover:-translate-y-0.5
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
            >
              <Image
                {...imageProps(p.url, 384)}
                alt={p.alt}
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 182px"
                quality={90}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/85 p-4 backdrop-blur-sm"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close photo"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full
                       bg-white/90 text-xl leading-none text-ink-900 hover:bg-white
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ×
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); step(-1); }}
                aria-label="Previous photo"
                className="absolute left-2 grid h-10 w-10 place-items-center rounded-full bg-white/80
                           text-xl leading-none text-ink-900 hover:bg-white sm:left-6
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); step(1); }}
                aria-label="Next photo"
                className="absolute right-2 grid h-10 w-10 place-items-center rounded-full bg-white/80
                           text-xl leading-none text-ink-900 hover:bg-white sm:right-6
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                ›
              </button>
            </>
          )}

          {/* A fixed box with object-contain, so a square gallery photo and a
              9:16 reel frame both sit correctly without being stretched. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative h-[min(74vh,640px)] w-[min(86vw,360px)]"
          >
            <Image
              {...imageProps(current.url, 720)}
              alt={current.alt}
              fill
              sizes="360px"
              quality={90}
              className="rounded-xl object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
