"use client";

import Image from "next/image";
import { imageProps } from "@/lib/image";
import { useState } from "react";

/** Simple accessible carousel — thumbnails act as tabs over one large image. */
export default function ProductGallery({
  images,
  productName,
}: {
  images: { url: string; alt: string }[];
  productName: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="card grid aspect-square place-items-center bg-rose-50 text-ink-600">
        Photo coming soon
      </div>
    );
  }

  return (
    <div>
      {/* object-CONTAIN, not cover. Half this catalogue is photographed
          portrait — pots, light stands, garlands are tall things — and a
          portrait photo filling a square box loses the top and bottom of
          itself. Measured across the 920 photographs, cover cropped a median
          of 25% away here, and more than 30% from 360 of them. On the one
          page where a customer decides whether to enquire, the product has to
          be shown whole, even if that leaves background either side of it. */}
      <div className="card relative aspect-square overflow-hidden bg-rose-50 p-2">
        <Image
          {...imageProps(images[active].url, 1040)}
          alt={images[active].alt || productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 520px"
          className="object-contain"
        />
      </div>

      {/* A div, not a ul: role="tablist" requires its tabs to be direct
          children, and the <li> wrappers this used to have broke that
          relationship — axe flagged aria-required-children,
          aria-required-parent and listitem all at once. It went unnoticed
          because no product had a second photo until now. */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2" role="tablist" aria-label={`${productName} photos`}>
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors duration-200 ${
                i === active ? "border-rose-600" : "border-line hover:border-rose-300"
              }`}
            >
              <Image {...imageProps(img.url, 128)} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
