import Image from "next/image";
import Link from "next/link";

export default function CategoryCard({
  slug,
  name,
  description,
  imageUrl,
  count,
  priority,
}: {
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  count?: number;
  priority?: boolean;
}) {
  return (
    <article className="card group relative flex h-full w-full flex-col overflow-hidden transition-shadow duration-200 hover:shadow-[0_8px_28px_-12px_rgba(155,44,90,0.28)]">
      <div className="relative aspect-[5/3] bg-rose-50">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            priority={priority}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-xl leading-snug">
          <Link href={`/categories/${slug}`} className="after:absolute after:inset-0 hover:text-rose-600">
            {name}
          </Link>
        </h3>
        <p className="text-sm leading-relaxed text-ink-600">{description}</p>
        {typeof count === "number" && (
          <p className="mt-auto pt-2 text-[13px] font-semibold text-rose-600">
            {count} {count === 1 ? "item" : "items"}
          </p>
        )}
      </div>
    </article>
  );
}
