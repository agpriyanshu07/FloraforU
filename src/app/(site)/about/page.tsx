import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, BoxIcon, HeartIcon, SparkIcon } from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";

// Cached; admin writes revalidate this path explicitly, so the window is a backstop.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About us",
  description:
    "FloralforU is a one-stop event décor, artificial flower and SFX supplier in Bank More, Dhanbad — serving brides, event planners and shopkeepers across Jharkhand.",
};

const VALUES = [
  {
    icon: BoxIcon,
    title: "One stop, genuinely",
    body: "Flowers, backdrops, lights, pots, packing material and SFX machines under one roof — so you're not chasing four suppliers for one event.",
  },
  {
    icon: HeartIcon,
    title: "We pick up the phone",
    body: "You get a real person on WhatsApp who knows the stock, not a ticket number. Most enquiries are answered the same day.",
  },
  {
    icon: SparkIcon,
    title: "Packed like it matters",
    body: "Every outstation order is photographed before dispatch. Fragile items are double-packed. Nothing leaves the shop unchecked.",
  },
];

const SPECIALTIES = [
  "Artificial Flowers",
  "Decoration Items",
  "Event Props",
  "Backdrop Cloths",
  "Carpets & Durries",
  "Decorative Lights",
  "Lamps & Diyas",
  "Packing Materials",
  "Wrapping Items",
  "SFX Machines",
  "Gift Hampers",
  "Puja & Festive Décor",
];

export default async function AboutPage() {
  const [settings, productCount, categoryCount] = await Promise.all([
    getSettings(),
    db.product.count({ where: { published: true } }),
    db.category.count(),
  ]);

  return (
    <div className="shell py-10">
      <header className="max-w-3xl">
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)]">
          About {settings.businessName}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-600">
          We run a décor and event-supplies shop out of Bank More, {settings.city}.
          What started as a small counter for artificial flowers has grown into{" "}
          {productCount} listed products across {categoryCount} categories — flowers
          and greenery, backdrop cloths, lights, lamps, pots, packing material,
          gift hampers, Rajasthani props and a full range of SFX machines.
        </p>
        <p className="mt-4 leading-relaxed text-ink-600">
          Most of our customers are brides planning one big day, event planners
          working three functions a weekend, and shopkeepers buying in bulk for the
          festive season. We price for all three, and we&apos;re happy to quote for
          a single lardi or for a full mandap.
        </p>
      </header>

      <section aria-labelledby="values-heading" className="mt-14">
        <h2 id="values-heading" className="font-display text-2xl">
          What we stand for
        </h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="card p-5">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-100 text-rose-700">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="specialties-heading" className="mt-14">
        <h2 id="specialties-heading" className="font-display text-2xl">
          Our specialties
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => (
            <li
              key={s}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium"
            >
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 grid items-center gap-8 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line">
          <Image
            src="/img/gallery/g9.svg"
            alt="The FloralforU shop counter at Bank More, Dhanbad (placeholder artwork, awaiting real shop photograph)"
            fill
            sizes="(max-width: 1024px) 100vw, 560px"
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="font-display text-2xl">Come see it in person</h2>
          <p className="mt-3 leading-relaxed text-ink-600">
            Photos only go so far with décor — colours, weights and finishes are
            easier to judge in hand. Our shop is open {settings.hours.toLowerCase()},
            and you&apos;re welcome to come look through the stock before you decide.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="btn-primary">
              Get directions &amp; hours
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/catalogue" className="btn-ghost">
              Browse the catalogue
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
