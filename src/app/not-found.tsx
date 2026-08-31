import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-6xl text-rose-600">404</p>
      <h1 className="font-display text-3xl">We can&apos;t find that page</h1>
      <p className="max-w-md text-ink-600">
        The page may have moved, or the product may no longer be listed. Try the
        catalogue — or just ask us on WhatsApp, we probably still have it.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/catalogue" className="btn-primary">
          Browse the catalogue
        </Link>
        <Link href="/" className="btn-ghost">
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
