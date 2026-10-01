"use client";

import { useState, useSyncExternalStore } from "react";
import { bulkProductAction } from "@/lib/admin-actions";

/**
 * Bulk actions operate on whatever rows are ticked in the products table.
 * The destructive option confirms; the recategorise option reveals a target
 * picker rather than showing it permanently (progressive disclosure).
 *
 * The panel folds down to one line until something is ticked. It used to hold
 * a full row of controls at all times, directly above the table, which on a
 * phone is a screenful of things you cannot use yet. It also now says how many
 * rows are selected — the count matters most on the action that cannot be
 * undone, and the table alone never told you.
 *
 * The count comes from the checkboxes themselves rather than from React state:
 * the rows are server-rendered and joined to this by `form="products-form"`,
 * so the form element is the one place that actually knows. Before hydration
 * the count is unknown and the controls render in full, which is also what a
 * browser with no JavaScript keeps.
 */
const UNKNOWN = -1;

function subscribeToSelection(onChange: () => void) {
  const form = document.getElementById("products-form");
  form?.addEventListener("change", onChange);
  return () => form?.removeEventListener("change", onChange);
}

function countSelected() {
  return document.querySelectorAll<HTMLInputElement>(
    '#products-form input[name="ids"]:checked',
  ).length;
}
export default function BulkBar({
  categories,
  subcategories,
}: {
  categories: { id: string; name: string }[];
  subcategories: { id: string; name: string; categoryName: string }[];
}) {
  const [action, setAction] = useState("");
  const selected = useSyncExternalStore(subscribeToSelection, countSelected, () => UNKNOWN);

  if (selected === 0) {
    return (
      <p className="mb-4 text-[13px] text-ink-600">
        Tick rows below to publish, move, file under a subcategory, or delete
        several products at once.
      </p>
    );
  }

  return (
    <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
      <div>
        <label htmlFor="bulkAction" className="field-label">
          With selected products
        </label>
        <select
          id="bulkAction"
          name="bulkAction"
          form="products-form"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="field sm:w-56"
        >
          <option value="">Choose an action…</option>
          <option value="publish">Publish</option>
          <option value="unpublish">Unpublish</option>
          <option value="recategorise">Move to category…</option>
          <option value="subcategorise">File under subcategory…</option>
          <option value="unfile">Remove from its subcategory</option>
          <option value="delete">Delete permanently</option>
        </select>
      </div>

      {action === "recategorise" && (
        <div>
          <label htmlFor="bulkCategoryId" className="field-label">
            Move to
          </label>
          <select
            id="bulkCategoryId"
            name="bulkCategoryId"
            form="products-form"
            required
            className="field sm:w-56"
          >
            <option value="">Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {action === "subcategorise" && (
        <div>
          <label htmlFor="bulkSubcategoryId" className="field-label">
            File under
          </label>
          <select
            id="bulkSubcategoryId"
            name="bulkSubcategoryId"
            form="products-form"
            required
            className="field sm:w-72"
          >
            <option value="">Choose a subcategory…</option>
            {/* Grouped by category, and the category is named, because a
                subcategory on its own is ambiguous: "Hanging" exists under
                both Lights and Artificial Flowers. Picking the wrong one is
                not an error the server can catch — it would just file the
                products somewhere the shop did not mean. */}
            {categories.map((c) => {
              const options = subcategories.filter((s) => s.categoryName === c.name);
              if (options.length === 0) return null;
              return (
                <optgroup key={c.id} label={c.name}>
                  {options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <span className="field-hint">
            Only products already in that category are filed; anything else in
            the selection is left alone.
          </span>
        </div>
      )}

      <button
        type="submit"
        form="products-form"
        formAction={bulkProductAction}
        disabled={!action}
        className={action === "delete" ? "btn-danger" : "btn-primary"}
        onClick={(e) => {
          if (
            action === "delete" &&
            !window.confirm(
              "Delete every selected product permanently? This cannot be undone.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        Apply
      </button>

      <p className="text-[13px] text-ink-600">
        {selected === UNKNOWN
          ? "Tick rows in the table below, then apply."
          : `${selected} product${selected === 1 ? "" : "s"} selected.`}
      </p>
    </div>
  );
}
