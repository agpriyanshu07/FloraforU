import { InstagramIcon, StarIcon } from "./icons";

export default function ReviewCard({
  customerName,
  eventType,
  quote,
  rating,
  source,
  sourceUrl,
}: {
  customerName: string;
  eventType: string;
  quote: string;
  rating: number;
  source: string;
  /** Link back to the original post, when the quote came from Instagram. */
  sourceUrl?: string | null;
}) {
  const initials = customerName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <figure className="card flex h-full w-full flex-col gap-3 p-5">
      <div className="flex items-center gap-1 text-marigold-600" role="img" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} filled={n <= rating} />
        ))}
      </div>
      <blockquote className="flex-1 text-[15px] leading-relaxed text-ink-900">
        “{quote}”
      </blockquote>
      <figcaption className="flex items-center gap-3 border-t border-line pt-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 font-display text-sm font-bold text-rose-700"
        >
          {initials || "F"}
        </span>
        <span className="text-sm">
          <span className="block font-semibold text-ink-900">{customerName}</span>
          <span className="block text-ink-600">
            {eventType}
            {eventType && source ? " · " : ""}
            {/* Where a quote came from Instagram, it links to the real post
                rather than asking anyone to take the attribution on trust. */}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700"
              >
                <InstagramIcon className="h-3.5 w-3.5" />
                {source}
              </a>
            ) : (
              source
            )}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
