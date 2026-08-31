"use client";

import { useState } from "react";
import { deleteCategoryAction } from "@/lib/admin-actions";

/**
 * Deleting a category that still holds products forces a reassignment choice —
 * products can never be silently orphaned.
 */
export default function DeleteCategory({
  id,
  name,
  productCount,
  others,
}: {
  id: string;
  name: string;
  productCount: number;
  others: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (productCount === 0) {
    return (
      <form
        action={deleteCategoryAction}
        onSubmit={(e) => {
          if (!window.confirm(`Delete the empty category “${name}”?`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="btn-danger btn-sm">Delete</button>
      </form>
    );
  }

  return (
    <>
      <button type="button" className="btn-danger btn-sm" onClick={() => setOpen(true)}>
        Delete
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`del-${id}`}
          className="fixed inset-0 z-50 grid place-items-center bg-ink-900/50 p-4"
        >
          <div className="card w-full max-w-md p-6 text-left">
            <h2 id={`del-${id}`} className="font-display text-xl">
              Delete “{name}”?
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              This category still has <strong>{productCount}</strong> product
              {productCount === 1 ? "" : "s"}. Choose where they should move to —
              they can&apos;t be left without a category.
            </p>

            <form action={deleteCategoryAction} className="mt-4">
              <input type="hidden" name="id" value={id} />
              <label htmlFor={`reassign-${id}`} className="field-label">
                Move those products to
              </label>
              <select id={`reassign-${id}`} name="reassignTo" required className="field">
                <option value="">Choose a category…</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-danger btn-sm">
                  Move products &amp; delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
