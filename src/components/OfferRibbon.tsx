"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import Countdown from "./Countdown";
import { CloseIcon, SparkIcon } from "./icons";
import { offerTheme } from "@/lib/offers";

export type RibbonOffer = {
  id: string;
  title: string;
  discountLabel: string | null;
  endsAt: string;
  endsAtLabel: string;
  theme: string;
  urgentWithinHours: number;
};

const DISMISS_KEY = "ffu:ribbon-dismissed";
const SEEN_KEY = "ffu:ribbon-seen";

/**
 * sessionStorage read as an external store rather than through an effect, so
 * the ribbon renders correctly on the server (visible by default) and only
 * disappears for someone who actually dismissed it this session.
 */
let listeners: Array<() => void> = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
  };
}

function emit() {
  for (const l of listeners) l();
}

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    // Private mode or storage disabled. Treating it as "nothing stored" keeps
    // the ribbon visible, which is the safe default — it just won't remember.
    return null;
  }
}

function write(key: string, value: string, notify = true) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Nothing to do; the in-memory state still updates for this page view.
  }
  if (notify) emit();
}

/**
 * Thin site-wide sale bar. Before this, an active sale was only visible on the
 * homepage strip and /offers — someone landing on a product page from a shared
 * WhatsApp link had no idea a campaign was running at all.
 *
 * Sits in normal flow above the header rather than fixed over the page: a
 * permanently fixed bar eats vertical space on every scroll on a phone and is a
 * well-known focus-order hazard.
 */
export default function OfferRibbon({ offer }: { offer: RibbonOffer }) {
  const pathname = usePathname();
  const dismissedId = useSyncExternalStore(
    subscribe,
    () => read(DISMISS_KEY),
    () => null, // server: never dismissed
  );
  // The sparkle is applied to the DOM in an effect rather than through state:
  // the server renders without it (so it can't be baked into cached HTML and
  // replay for every visitor forever), and adding a class post-mount avoids
  // both a hydration mismatch and a re-render cascade. Fires once per session
  // per campaign — a new offer earns one flourish, the next dozen page views
  // do not.
  const sparkRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (read(SEEN_KEY) === offer.id) return;
    write(SEEN_KEY, offer.id, false);

    const el = sparkRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.classList.add("ffu-sparkle");
    const done = () => el.classList.remove("ffu-sparkle");
    el.addEventListener("animationend", done, { once: true });
    return () => el.removeEventListener("animationend", done);
  }, [offer.id]);

  // Redundant on the offers page itself — the visitor is already looking at
  // the campaigns in full, so a bar pointing them there is just noise.
  if (pathname === "/offers") return null;
  if (dismissedId === offer.id) return null;

  const theme = offerTheme(offer.theme);

  return (
    <aside aria-label="Current offer" className={`${theme.bg} text-white`}>
      <div className="shell flex items-center gap-x-3 gap-y-1 py-2 text-sm">
        <span ref={sparkRef} className="shrink-0">
          <SparkIcon className="h-4 w-4" />
        </span>

        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold">{offer.title}</span>
          {offer.discountLabel && (
            // A solid white chip carrying the campaign's own colour, rather
            // than white-on-white/20: that translucent version resolved to
            // white on #c3753a — 3.54:1, under AA. It only rendered once a
            // campaign actually carried a discount badge, which is why nothing
            // caught it until one did. buttonText is the theme's own token for
            // exactly this case, so it stays legible on all four ribbons.
            <span
              className={`rounded bg-white px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-wide ${theme.buttonText}`}
            >
              {offer.discountLabel}
            </span>
          )}
          <Countdown
            endsAt={offer.endsAt}
            fallback={`Ends ${offer.endsAtLabel}`}
            urgentWithinHours={offer.urgentWithinHours}
            chipClass={theme.chip}
            escalate
          />
        </p>

        <Link
          href="/offers"
          className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-ink-900 hover:bg-cream"
        >
          View offers
        </Link>

        <button
          type="button"
          onClick={() => write(DISMISS_KEY, offer.id)}
          // 44px hit area per the touch-target rule, without deepening the bar.
          className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/15"
        >
          <CloseIcon className="h-4 w-4" />
          <span className="sr-only">Dismiss the offer bar for this visit</span>
        </button>
      </div>
    </aside>
  );
}
