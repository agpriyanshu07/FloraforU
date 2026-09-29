"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveOfferAction, type ActionState } from "@/lib/admin-actions";
import { formatPrice } from "@/lib/format";
import { OFFER_THEMES, OFFER_THEME_NAMES } from "@/lib/offers";
import { StickyActions } from "./ui";

type Product = {
  id: string;
  name: string;
  categoryName: string;
  price: number | null;
  imageUrl: string | null;
  priceOnEnquiry: boolean;
};

/** How many unpicked products the browse list draws before asking you to type. */
const BROWSE_LIMIT = 30;

function Save({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : isEdit ? "Save campaign" : "Create campaign"}
    </button>
  );
}

/** What the campaign percentage works out at, as a placeholder. */
function percentPrice(price: number, percent: string): string | null {
  const pct = Number(percent);
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return null;
  return String(Math.round(price * (1 - pct / 100)));
}

/** Plain-language confirmation of what a shopper will see for this product. */
function describeRate(price: number, override: string | undefined, percent: string): string {
  const typed = override?.trim();
  if (typed) {
    const value = Number(typed);
    if (!Number.isFinite(value) || value <= 0) return "Enter a number";
    if (value >= price) return `Not a discount — ${formatPrice(price, false)} or less, please`;
    return `Shows as ${formatPrice(value, false)}, ${Math.round(((price - value) / price) * 100)}% off`;
  }
  const fromPercent = percentPrice(price, percent);
  if (!fromPercent) return "No discount — shown at the usual price";
  return `Shows as ${formatPrice(Number(fromPercent), false)} from the campaign percentage`;
}

export default function OfferForm({
  products,
  values = {},
}: {
  products: Product[];
  values?: {
    id?: string;
    title?: string;
    description?: string;
    bannerUrl?: string;
    startsAt?: string;
    endsAt?: string;
    published?: boolean;
    productIds?: string[];
    discountPercent?: number | null;
    /** Per-product overrides, keyed by product id. */
    offerPrices?: Record<string, number | null>;
    discountLabel?: string;
    theme?: string;
    priority?: number;
    urgentWithinHours?: number;
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveOfferAction, {});
  const [filter, setFilter] = useState("");
  const isEdit = Boolean(values.id);
  const err = (n: string) => state.fieldErrors?.[n];

  // React clears the form after a rejected action — re-apply what was typed,
  // including which products had been ticked.
  const sent = state.values;
  const str = (n: string, initial: string | undefined) =>
    sent ? (sent[n] ?? "") : (initial ?? "");
  // Controlled, for the same reason as ProductForm: React's post-action reset
  // would otherwise clear every tick when a submit is rejected.
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        sent ? (sent.productIds ?? "").split(",").filter(Boolean) : (values.productIds ?? []),
      ),
  );
  // Percentage lives in state so the picker can show what each product will
  // actually cost while it is being typed — a shop should see the rupee figure
  // before publishing it, not after.
  const [percent, setPercent] = useState(
    sent ? (sent.discountPercent ?? "") : (values.discountPercent?.toString() ?? ""),
  );
  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    if (sent) {
      try {
        return JSON.parse(sent.offerPrices || "{}");
      } catch {
        return {};
      }
    }
    return Object.fromEntries(
      Object.entries(values.offerPrices ?? {})
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    );
  });

  const [published, setPublished] = useState(
    sent ? sent.published === "on" : (values.published ?? true),
  );
  const [theme, setTheme] = useState(
    sent ? (sent.theme ?? "marigold") : (values.theme ?? "marigold"),
  );

  const needle = filter.trim().toLowerCase();
  const matches = needle
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.categoryName.toLowerCase().includes(needle),
      )
    : products;

  // Everything already in the campaign is rendered, always, whatever the
  // filter says and however long the list gets. These checkboxes ARE the
  // submission -- they carry name="productIds" -- so a picked product left out
  // of the DOM would be quietly dropped from the campaign on save. Drawing
  // them first is also the useful order: it answers "what is in this sale"
  // without scrolling.
  const picked = products.filter((p) => selected.has(p.id));

  // The rest is capped. With 590 products this list was rendering 590
  // checkboxes and 590 price overrides on one page -- 608 form fields, and
  // 5502px of it on a phone. Nobody picks a sale item by scrolling 590 rows;
  // they type a name.
  const rest = matches.filter((p) => !selected.has(p.id));
  const shown = rest.slice(0, BROWSE_LIMIT);
  const hidden = rest.length - shown.length;
  const visible = [...picked, ...shown];

  return (
    <form key={state.nonce ?? "initial"} action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {/* One field rather than an input per product: the server needs the whole
          map at once, and this is what gets replayed when a submit is rejected. */}
      <input
        type="hidden"
        name="offerPrices"
        value={JSON.stringify(
          Object.fromEntries(
            Object.entries(overrides).filter(
              ([id, v]) => selected.has(id) && v.trim() !== "",
            ),
          ),
        )}
      />

      {state.error && (
        <p role="alert" className="lg:col-span-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <div className="card space-y-4 p-5">
        <h2 className="font-display text-xl">Campaign</h2>

        <div>
          <label htmlFor="title" className="field-label">Campaign name</label>
          <input id="title" name="title" required defaultValue={str("title", values.title)} className="field" placeholder="e.g. Ganesh Puja Sale" />
          {err("title") && <span className="field-error">{err("title")}</span>}
        </div>

        <div>
          <label htmlFor="offer-description" className="field-label">Description</label>
          <textarea id="offer-description" name="description" rows={3} defaultValue={str("description", values.description)} className="field" />
        </div>

        <div>
          <label htmlFor="bannerUrl" className="field-label">
            Banner image URL <span className="font-normal text-ink-600">(optional)</span>
          </label>
          <input id="bannerUrl" name="bannerUrl" defaultValue={str("bannerUrl", values.bannerUrl)} className="field font-mono text-[13px]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startsAt" className="field-label">Starts</label>
            <input id="startsAt" name="startsAt" type="date" required defaultValue={str("startsAt", values.startsAt)} className="field" />
            {err("startsAt") && <span className="field-error">{err("startsAt")}</span>}
          </div>
          <div>
            <label htmlFor="endsAt" className="field-label">Ends</label>
            <input id="endsAt" name="endsAt" type="date" required defaultValue={str("endsAt", values.endsAt)} className="field" />
            {err("endsAt") && <span className="field-error">{err("endsAt")}</span>}
          </div>
        </div>

        <div>
          <label htmlFor="discountLabel" className="field-label">
            Discount badge <span className="font-normal text-ink-600">(optional)</span>
          </label>
          <input
            id="discountLabel"
            name="discountLabel"
            defaultValue={str("discountLabel", values.discountLabel)}
            className="field"
            placeholder="e.g. 30% OFF, Flat ₹200 off, Buy 2 get 1"
          />
          <span className="field-hint">
            Shown big and bold on the sale bar. Leave empty to show just the campaign name.
          </span>
          {err("discountLabel") && <span className="field-error">{err("discountLabel")}</span>}
        </div>

        <div>
          <label htmlFor="discountPercent" className="field-label">
            Discount percentage <span className="font-normal text-ink-600">(optional)</span>
          </label>
          <input
            id="discountPercent"
            name="discountPercent"
            type="number"
            min={0}
            max={99}
            inputMode="numeric"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="field"
            placeholder="e.g. 20"
          />
          <span className="field-hint">
            This one changes prices. Every product below shows its old rate struck
            through and the new one beside it. The badge above is only wording —
            leave this empty for a “Buy 2 get 1” style campaign that has no single
            percentage.
          </span>
          {err("discountPercent") && (
            <span className="field-error">{err("discountPercent")}</span>
          )}
        </div>

        <div>
          <label htmlFor="theme" className="field-label">Campaign colour</label>
          <select
            id="theme"
            name="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="field"
          >
            {OFFER_THEME_NAMES.map((name) => (
              <option key={name} value={name}>
                {OFFER_THEMES[name].label}
              </option>
            ))}
          </select>
          <span className="field-hint">
            Gives this campaign its own look, so two sales running together don&apos;t
            read as the same banner twice.
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="priority" className="field-label">Priority</label>
            <input
              id="priority"
              name="priority"
              type="number"
              min={0}
              max={100}
              defaultValue={str("priority", String(values.priority ?? 0))}
              className="field"
            />
            <span className="field-hint">
              Higher shows first when several campaigns run at once.
            </span>
            {err("priority") && <span className="field-error">{err("priority")}</span>}
          </div>
          <div>
            <label htmlFor="urgentWithinHours" className="field-label">
              Urgent within (hours)
            </label>
            <input
              id="urgentWithinHours"
              name="urgentWithinHours"
              type="number"
              min={1}
              max={720}
              defaultValue={str("urgentWithinHours", String(values.urgentWithinHours ?? 48))}
              className="field"
            />
            <span className="field-hint">
              When the countdown starts looking urgent. It turns red in the last 6 hours
              regardless.
            </span>
            {err("urgentWithinHours") && (
              <span className="field-error">{err("urgentWithinHours")}</span>
            )}
          </div>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="published"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[#9b2c5a]"
          />
          <span>
            <span className="block text-sm font-semibold">Published</span>
            <span className="block text-[13px] text-ink-600">
              Even when published, the campaign only shows on the site between its start and end dates,
              and hides itself automatically once it ends.
            </span>
          </span>
        </label>

        <StickyActions>
          <Save isEdit={isEdit} />
          <Link href="/admin/offers" className="btn-ghost">Cancel</Link>
        </StickyActions>
      </div>

      <div className="card p-5">
        {/* Three stacked grey paragraphs used to sit between the heading and
            the list -- what the panel does, how many were picked, how many
            were hidden -- so the products themselves started below a wall of
            hint text. The count is a chip on the heading now, and the
            hidden-count line sits under the list it describes. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">Products in this offer</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
              selected.size > 0 ? "bg-rose-100 text-rose-700" : "bg-line text-ink-600"
            }`}
          >
            {selected.size} picked
          </span>
        </div>
        <p className="mt-1 text-[13px] text-ink-600">
          Anything picked here carries an OFFER badge across the site while the
          campaign runs.
        </p>

        <div className="mt-4">
          <label htmlFor="offer-filter" className="sr-only">Filter products</label>
          <input
            id="offer-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by product or category…"
            className="field"
          />
        </div>

        <ul className="mt-3 max-h-[26rem] space-y-1 overflow-y-auto pr-1">
          {picked.length > 0 && (
            <li className="px-1 pb-1 pt-2 text-[12px] font-bold uppercase tracking-wider text-ink-600">
              In this campaign
            </li>
          )}
          {visible.length === 0 ? (
            <li className="px-1 py-6 text-center text-sm text-ink-600">
              No products match “{filter}”.
            </li>
          ) : (
            visible.map((p, rowIndex) => (
              <li key={p.id}>
                {/* The divider between what is in the sale and what is not.
                    Without it a ten-item campaign ran straight into thirty
                    unrelated products with nothing marking the join. */}
                {picked.length > 0 && rowIndex === picked.length && (
                  <span className="mt-3 block px-1 pb-1 pt-2 text-[12px] font-bold uppercase tracking-wider text-ink-600">
                    Other products
                  </span>
                )}
                <label
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 text-sm transition-colors duration-150 ${
                    selected.has(p.id)
                      ? "border-rose-200 bg-rose-50/70"
                      : "border-transparent hover:bg-rose-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="productIds"
                    value={p.id}
                    checked={selected.has(p.id)}
                    onChange={(e) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        return next;
                      })
                    }
                    className="h-5 w-5 shrink-0 accent-[#9b2c5a]"
                  />
                  {/* Every other product list in the admin carries a
                      thumbnail. Picking a sale item out of 590 by name alone
                      was the one place that made you read rather than look. */}
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line bg-rose-50">
                    {p.imageUrl && (
                      <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block truncate text-[12px] text-ink-600">
                      {p.categoryName}
                      {p.priceOnEnquiry
                        ? " · price on enquiry"
                        : p.price !== null
                          ? ` · ${formatPrice(p.price, false)}`
                          : ""}
                    </span>
                  </span>
                </label>

                {/* Only for products actually in the campaign, and only when
                    they have a price to discount. The rupee figure is shown as
                    it is typed so nobody publishes a sale they have not seen. */}
                {selected.has(p.id) && !p.priceOnEnquiry && p.price !== null && (
                  <div className="ml-9 mb-2 flex flex-wrap items-center gap-2 text-[13px]">
                    <label htmlFor={`price-${p.id}`} className="text-ink-600">
                      Special price
                    </label>
                    <input
                      id={`price-${p.id}`}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={overrides[p.id] ?? ""}
                      onChange={(e) =>
                        setOverrides((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      placeholder={percentPrice(p.price, percent) ?? "—"}
                      className="field h-9 w-28 !py-1"
                    />
                    <span className="text-ink-600">
                      {describeRate(p.price, overrides[p.id], percent)}
                    </span>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
        {hidden > 0 && (
          <p className="mt-2 text-[13px] text-ink-600">
            {hidden} more{" "}
            {needle
              ? hidden === 1 ? "match" : "matches"
              : hidden === 1 ? "product" : "products"}{" "}
            not shown — search to narrow it down.
          </p>
        )}
      </div>
    </form>
  );
}
