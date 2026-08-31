import Link from "next/link";

export default function Pagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && k !== "page") sp.set(k, v);
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <nav aria-label="Catalogue pages" className="mt-8 flex justify-center">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} className="btn-ghost btn-sm" rel="prev">
              Previous
            </Link>
          ) : (
            <span aria-disabled="true" className="btn-ghost btn-sm cursor-not-allowed text-ink-600">Previous</span>
          )}
        </li>
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            {i > 0 && pages[i - 1] !== p - 1 && (
              <span className="px-1 text-ink-600" aria-hidden>
                …
              </span>
            )}
            {p === page ? (
              <span
                aria-current="page"
                className="grid h-10 min-w-10 place-items-center rounded-full bg-rose-600 px-3 text-sm font-semibold text-white"
              >
                {p}
              </span>
            ) : (
              <Link
                href={href(p)}
                aria-label={`Page ${p}`}
                className="grid h-10 min-w-10 place-items-center rounded-full border border-line bg-surface px-3 text-sm font-semibold hover:bg-rose-50"
              >
                {p}
              </Link>
            )}
          </li>
        ))}
        <li>
          {page < pageCount ? (
            <Link href={href(page + 1)} className="btn-ghost btn-sm" rel="next">
              Next
            </Link>
          ) : (
            <span aria-disabled="true" className="btn-ghost btn-sm cursor-not-allowed text-ink-600">Next</span>
          )}
        </li>
      </ul>
    </nav>
  );
}
