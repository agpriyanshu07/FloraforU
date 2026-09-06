import type { Metadata } from "next";
import WishlistBoard from "@/components/WishlistBoard";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";

// The saved list itself is per-browser, so there is nothing visitor-specific to
// render on the server. Only the shell and the offer badges come from here, and
// both are the same for everyone — so this caches like every other public page.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Saved items",
  description:
    "The décor, flowers and props you've saved to plan your event. Send the whole list to FloralforU on WhatsApp to check stock and rates.",
  // Every visitor's list is different and none of it is on the server, so there
  // is nothing here worth indexing.
  robots: { index: false, follow: true },
};

export default async function WishlistPage() {
  const now = new Date();
  const [settings, offerRows] = await Promise.all([
    getSettings(),
    db.offerProduct.findMany({
      where: {
        offer: { published: true, startsAt: { lte: now }, endsAt: { gte: now } },
      },
      select: {
        offerPrice: true,
        product: { select: { slug: true } },
        offer: { select: { discountPercent: true } },
      },
    }),
  ]);

  return (
    <div className="shell py-10">
      <header className="mb-7">
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.6rem)]">Saved items</h1>
        <p className="mt-2 max-w-2xl text-ink-600">
          Everything you&apos;ve tapped the heart on, kept together while you plan.
          When you&apos;re ready, send the whole list to us on WhatsApp and
          we&apos;ll confirm stock, rates and delivery.
        </p>
      </header>

      <WishlistBoard
        settings={settings}
        // A plain object rather than a Map: this crosses into a client
        // component, and only JSON survives that boundary.
        offerTermsBySlug={Object.fromEntries(
          offerRows.map((r) => [
            r.product.slug,
            { offerPrice: r.offerPrice, discountPercent: r.offer.discountPercent },
          ]),
        )}
      />
    </div>
  );
}
