"use client";

import Image from "next/image";
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
      <div className="card relative aspect-square overflow-hidden bg-rose-50">
        <Image
          src={images[active].url}
          alt={images[active].alt || productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 520px"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <ul className="mt-3 flex gap-2" role="tablist" aria-label={`${productName} photos`}>
          {images.map((img, i) => (
            <li key={img.url + i}>
              <button
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                onClick={() => setActive(i)}
                className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors duration-200 ${
                  i === active ? "border-rose-600" : "border-line hover:border-rose-300"
                }`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
