"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import EmptyState from "./EmptyState";
import { HeartIcon, WhatsappIcon } from "./icons";
import { clear, useWishlist } from "@/lib/wishlist";
import { buildWhatsappUrl, withUtm } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/format";
import type { ProductCardData } from "@/lib/queries";
import type { OfferTerms } from "@/lib/pricing";
import type { SiteSettings } from "@/lib/settings";

/**
 * The saved-items page.
 *
 * The list of slugs is the visitor's, held in their browser; the product detail
 * behind those slugs has to come from the server, so this asks for it on mount
 * and whenever the list changes. There is no saved list on the server to read,
 * by design — this site has no customer accounts.
 */
/**
 * JSON has no date type, so `newUntil` and `createdAt` arrive as strings while
 * ProductCard expects the Date objects it gets everywhere else on the site.
 * Without this the card throws on `newUntil.getTime()` and takes the page down
 * with it — which is exactly what it did the first time this was wired up.
 */
function revive(rows: unknown[]): ProductCardData[] {
  return (rows as ProductCardData[]).map((p) => ({
    ...p,
    newUntil: p.newUntil ? new Date(p.newUntil) : null,
    createdAt: new Date(p.createdAt),
  }));
}

export default function WishlistBoard({
  settings,
  offerTermsBySlug,
}: {
  settings: SiteSettings;
  /**
   * Campaign terms for every product in a live sale, keyed by slug, so a saved
   * item that has since gone on sale shows its new price here too — which is
   * most of the point of having saved it.
   */
  offerTermsBySlug: Record<string, OfferTerms>;
}) {
  const slugs = useWishlist();
  const key = slugs.join(",");

  const [products, setProducts] = useState<ProductCardData[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Nothing saved: the empty state is derived from `slugs` below, so there is
    // no request to make and no state to set here.
    if (slugs.length === 0) return;

    let cancelled = false;

    fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs }),
    })
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        setProducts(revive(body.products ?? []));
        setFailed(!body.ok);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
    // `key` stands in for the slug list: the array identity changes on every
    // store read, the joined string only when the saved items actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Checked before `products`, so emptying the list can't leave the previous
  // fetch's cards on screen.
  if (slugs.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        body="Tap the heart on any item to keep it here while you plan. Your list stays in this browser — no sign-in needed."
        actionLabel="Browse the catalogue"
        actionHref="/catalogue"
        icon={<HeartIcon className="h-8 w-8" />}
      />
    );
  }

  // First paint, before the browser's list has been read.
  if (products === null) {
    return (
      <p className="card px-6 py-14 text-center text-ink-600" role="status">
        Loading your saved items…
      </p>
    );
  }

  if (failed) {
    return (
      <EmptyState
        title="We couldn't load your saved items"
        body="Your list is still saved in this browser. Please check your connection and refresh, or message us on WhatsApp and we'll help."
        actionLabel="Browse the catalogue"
        actionHref="/catalogue"
        icon={<HeartIcon className="h-8 w-8" />}
      />
    );
  }

  // Saved items exist, but none of them resolve any more — every one has been
  // unpublished or removed since it was saved.
  if (products.length === 0) {
    return (
      <EmptyState
        title="Your saved items are no longer available"
        body="Everything on your list has sold out or been taken down since you saved it. Message us on WhatsApp and we'll tell you what we can get in."
        actionLabel="Browse the catalogue"
        actionHref="/catalogue"
        icon={<HeartIcon className="h-8 w-8" />}
      />
    );
  }

  // Some saved items no longer resolve — unpublished, renamed or removed since
  // they were saved. Say so rather than letting the count quietly disagree.
  const missing = slugs.length - products.length;

  const lines = products
    .map((p) => `• ${p.name}${p.code ? ` (${p.code})` : ""} — ${formatPrice(p.price, p.priceOnEnquiry)}`)
    .join("\n");

  const waHref = withUtm(
    buildWhatsappUrl({
      number: settings.whatsapp,
      message: `Hi FloralforU! I've saved these items and would like to check stock and rates:\n\n${lines}\n\n${settings.siteUrl}/wishlist`,
    }),
    "website",
    "wishlist",
  );



  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-600">
          {products.length} {products.length === 1 ? "item" : "items"} saved in this
          browser.
          {missing > 0 && (
            <>
              {" "}
              {missing} saved {missing === 1 ? "item is" : "items are"} no longer
              available.
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {/* The whole point of a saved list on a WhatsApp-only shop: send it
              as one message instead of enquiring item by item. */}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp btn-sm"
          >
            <WhatsappIcon className="h-4 w-4" />
            Send this list on WhatsApp
          </a>
          <button type="button" onClick={clear} className="btn-ghost btn-sm">
            Clear list
          </button>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id} className="flex">
            <ProductCard product={p} settings={settings} offer={offerTermsBySlug[p.slug]} />
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-ink-600">
        Saved items live in this browser only — they won&apos;t appear on your other
        devices, and clearing your browser data clears them.{" "}
        <Link href="/catalogue" className="font-medium text-rose-600 hover:text-rose-700">
          Keep browsing
        </Link>
        .
      </p>
    </>
  );
}
