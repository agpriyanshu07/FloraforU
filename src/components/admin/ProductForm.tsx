"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveProductAction, type ActionState } from "@/lib/admin-actions";

type Category = { id: string; name: string };

export type ProductFormValues = {
  id?: string;
  name?: string;
  categoryId?: string;
  spec?: string;
  description?: string;
  code?: string | null;
  price?: number | null;
  priceOnEnquiry?: boolean;
  availability?: string;
  published?: boolean;
  isNew?: boolean;
  slug?: string;
  imageUrls?: string[];
};

function Save({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
    </button>
  );
}

export default function ProductForm({
  categories,
  values = {},
}: {
  categories: Category[];
  values?: ProductFormValues;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveProductAction,
    {},
  );
  const isEdit = Boolean(values.id);
  const err = (name: string) => state.fieldErrors?.[name];

  // After a rejected submit React clears the form, so fall back to whatever the
  // server echoed back rather than to the original record.
  const sent = state.values;
  const str = (name: string, initial: string | number | null | undefined) =>
    sent ? (sent[name] ?? "") : (initial ?? "");

  // Selects and checkboxes are controlled rather than uncontrolled: React's
  // post-action form reset restores DOM defaults for those, so an echoed
  // defaultValue never reaches them. Controlled state survives the reset.
  const [poa, setPoa] = useState(sent ? sent.priceOnEnquiry === "on" : Boolean(values.priceOnEnquiry));
  const [categoryId, setCategoryId] = useState(sent ? (sent.categoryId ?? "") : (values.categoryId ?? ""));
  const [availability, setAvailability] = useState(
    sent ? (sent.availability ?? "in_stock") : (values.availability ?? "in_stock"),
  );
  const [published, setPublished] = useState(sent ? sent.published === "on" : (values.published ?? true));
  const [isNew, setIsNew] = useState(sent ? sent.isNew === "on" : Boolean(values.isNew));

  const describedBy = (name: string) =>
    err(name) ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {};

  return (
    <form key={state.nonce ?? "initial"} action={formAction} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      {state.error && (
        <p role="alert" className="lg:col-span-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <div className="card space-y-4 p-5">
        <h2 className="font-display text-xl">Product details</h2>

        <div>
          <label htmlFor="name" className="field-label">Product name</label>
          <input id="name" name="name" required defaultValue={str("name", values.name)} className="field" {...describedBy("name")} />
          {err("name") && <span id="name-error" className="field-error">{err("name")}</span>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="categoryId" className="field-label">Category</label>
            <select
              id="categoryId"
              name="categoryId"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="field"
              {...describedBy("categoryId")}
            >
              <option value="" disabled>Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {err("categoryId") && <span id="categoryId-error" className="field-error">{err("categoryId")}</span>}
          </div>

          <div>
            <label htmlFor="code" className="field-label">
              Product code <span className="font-normal text-ink-600">(optional)</span>
            </label>
            <input id="code" name="code" defaultValue={str("code", values.code)} className="field" placeholder="e.g. 2001" />
            <span className="field-hint">Included in the WhatsApp enquiry message.</span>
          </div>
        </div>

        <div>
          <label htmlFor="spec" className="field-label">Spec / pack line</label>
          <input
            id="spec"
            name="spec"
            defaultValue={str("spec", values.spec)}
            className="field"
            placeholder="e.g. Pack of 1 pc Size 1.5*3feet with 1 pipe n 2 bracket"
            {...describedBy("spec")}
          />
          <span className="field-hint">
            Free text — write it exactly as you&apos;d say it to a customer. This shows on every product card.
          </span>
          {err("spec") && <span id="spec-error" className="field-error">{err("spec")}</span>}
        </div>

        <div>
          <label htmlFor="description" className="field-label">
            Description <span className="font-normal text-ink-600">(optional)</span>
          </label>
          <textarea id="description" name="description" rows={5} defaultValue={str("description", values.description)} className="field" />
          <span className="field-hint">Shown on the product page. Good for colours, variants and delivery notes.</span>
        </div>

        <div>
          <label htmlFor="imageUrls" className="field-label">Image URLs</label>
          <textarea
            id="imageUrls"
            name="imageUrls"
            rows={4}
            defaultValue={sent ? (sent.imageUrls ?? "") : (values.imageUrls ?? []).join("\n")}
            className="field font-mono text-[13px]"
            placeholder={"/img/categories/pots-vases.svg\nhttps://res.cloudinary.com/…/pot-2.jpg"}
          />
          <span className="field-hint">
            One URL per line, up to 6. The first is the primary photo. Alt text is generated automatically.
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card space-y-4 p-5">
          <h2 className="font-display text-xl">Pricing</h2>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="priceOnEnquiry"
              checked={poa}
              onChange={(e) => setPoa(e.target.checked)}
              className="mt-1 h-5 w-5 accent-[#9b2c5a]"
            />
            <span>
              <span className="block text-sm font-semibold">Price on Enquiry</span>
              <span className="block text-[13px] text-ink-600">
                Hides the number and shows &ldquo;Price on Enquiry&rdquo; instead.
              </span>
            </span>
          </label>

          <div>
            <label htmlFor="price" className="field-label">Price (₹)</label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="1"
              defaultValue={str("price", values.price)}
              disabled={poa}
              className="field disabled:bg-rose-50 disabled:text-ink-300"
              {...describedBy("price")}
            />
            {err("price") && <span id="price-error" className="field-error">{err("price")}</span>}
          </div>

          <div>
            <label htmlFor="availability" className="field-label">Availability</label>
            <select
              id="availability"
              name="availability"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="field"
            >
              <option value="in_stock">In stock</option>
              <option value="limited">Limited stock</option>
              <option value="made_to_order">Made to order</option>
            </select>
          </div>
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="font-display text-xl">Visibility</h2>

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
              <span className="block text-[13px] text-ink-600">Unpublish to hide it from the site without deleting it.</span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="isNew"
              checked={isNew}
              onChange={(e) => setIsNew(e.target.checked)}
              className="mt-1 h-5 w-5 accent-[#9b2c5a]"
            />
            <span>
              <span className="block text-sm font-semibold">Show the &ldquo;New&rdquo; badge</span>
              <span className="block text-[13px] text-ink-600">Expires automatically after the window below.</span>
            </span>
          </label>

          <div>
            <label htmlFor="newDays" className="field-label">&ldquo;New&rdquo; badge lasts (days)</label>
            <input id="newDays" name="newDays" type="number" min="0" max="365" defaultValue={sent ? (sent.newDays ?? "21") : 21} className="field" />
          </div>

          <div>
            <label htmlFor="slug" className="field-label">
              URL slug <span className="font-normal text-ink-600">(optional)</span>
            </label>
            <input id="slug" name="slug" defaultValue={str("slug", values.slug)} className="field font-mono text-[13px]" placeholder="auto-generated from the name" />
            <span className="field-hint">Leave blank to generate it from the product name.</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Save isEdit={isEdit} />
          <Link href="/admin/products" className="btn-ghost">Cancel</Link>
        </div>
      </div>
    </form>
  );
}
