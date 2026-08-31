"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveCategoryAction, type ActionState } from "@/lib/admin-actions";

function Save({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : isEdit ? "Save changes" : "Add category"}
    </button>
  );
}

export default function CategoryForm({
  values = {},
}: {
  values?: {
    id?: string;
    name?: string;
    description?: string;
    imageUrl?: string;
    displayOrder?: number;
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveCategoryAction, {});
  const isEdit = Boolean(values.id);
  const err = (n: string) => state.fieldErrors?.[n];

  // React clears the form after a rejected action — re-apply what was typed.
  const sent = state.values;
  const str = (n: string, initial: string | number | undefined) =>
    sent ? (sent[n] ?? "") : (initial ?? "");

  return (
    <form key={state.nonce ?? "initial"} action={formAction} className="card space-y-4 p-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <h2 className="font-display text-xl">{isEdit ? `Edit “${values.name}”` : "Add a category"}</h2>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="cat-name" className="field-label">Name</label>
        <input id="cat-name" name="name" required defaultValue={str("name", values.name)} className="field" />
        {err("name") && <span className="field-error">{err("name")}</span>}
      </div>

      <div>
        <label htmlFor="cat-description" className="field-label">Description</label>
        <textarea
          id="cat-description"
          name="description"
          rows={4}
          required
          defaultValue={str("description", values.description)}
          className="field"
          placeholder="One or two sentences describing what's in this category."
        />
        <span className="field-hint">
          Shown on the category card and at the top of the category page — this is your SEO copy.
        </span>
        {err("description") && <span className="field-error">{err("description")}</span>}
      </div>

      <div>
        <label htmlFor="cat-image" className="field-label">
          Cover image URL <span className="font-normal text-ink-600">(optional)</span>
        </label>
        <input
          id="cat-image"
          name="imageUrl"
          defaultValue={str("imageUrl", values.imageUrl)}
          className="field font-mono text-[13px]"
          placeholder="/img/categories/pots-vases.svg"
        />
      </div>

      <div>
        <label htmlFor="cat-order" className="field-label">Display order</label>
        <input
          id="cat-order"
          name="displayOrder"
          type="number"
          min="0"
          defaultValue={str("displayOrder", values.displayOrder ?? 0)}
          className="field"
        />
        <span className="field-hint">Lower numbers appear first.</span>
      </div>

      <div className="flex gap-3">
        <Save isEdit={isEdit} />
        {isEdit && (
          <Link href="/admin/categories" className="btn-ghost">
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
