"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveOfferAction, type ActionState } from "@/lib/admin-actions";
import { OFFER_THEMES, OFFER_THEME_NAMES } from "@/lib/offers";

type Product = { id: string; name: string; categoryName: string };

function Save({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : isEdit ? "Save campaign" : "Create campaign"}
    </button>
  );
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
  const [published, setPublished] = useState(
    sent ? sent.published === "on" : (values.published ?? true),
  );
  const [theme, setTheme] = useState(
    sent ? (sent.theme ?? "marigold") : (values.theme ?? "marigold"),
  );

  const visible = filter
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(filter.toLowerCase()) ||
          p.categoryName.toLowerCase().includes(filter.toLowerCase()),
      )
    : products;

  return (
    <form key={state.nonce ?? "initial"} action={formAction} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {values.id && <input type="hidden" name="id" value={values.id} />}

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

        <div className="flex gap-3 pt-2">
          <Save isEdit={isEdit} />
          <Link href="/admin/offers" className="btn-ghost">Cancel</Link>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-xl">Products in this offer</h2>
        <p className="mt-1 text-[13px] text-ink-600">
          Tick any products to include. They get an OFFER badge everywhere on the site while the campaign is live.
        </p>

        <div className="mt-4">
          <label htmlFor="offer-filter" className="sr-only">Filter products</label>
          <input
            id="offer-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by product or category…"
            className="field"
          />
        </div>

        <ul className="mt-3 max-h-[26rem] space-y-1 overflow-y-auto pr-1">
          {visible.length === 0 ? (
            <li className="px-1 py-6 text-center text-sm text-ink-600">
              No products match “{filter}”.
            </li>
          ) : (
            visible.map((p) => (
              <li key={p.id}>
                <label className="flex items-start gap-2.5 rounded-lg p-2 text-sm hover:bg-rose-50">
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
                    className="mt-0.5 h-4 w-4 accent-[#9b2c5a]"
                  />
                  <span>
                    <span className="block font-medium">{p.name}</span>
                    <span className="block text-[12px] text-ink-600">{p.categoryName}</span>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
      </div>
    </form>
  );
}
