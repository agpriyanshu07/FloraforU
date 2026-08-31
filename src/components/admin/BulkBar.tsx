"use client";

import { useState } from "react";
import { bulkProductAction } from "@/lib/admin-actions";

/**
 * Bulk actions operate on whatever rows are ticked in the products table.
 * The destructive option confirms; the recategorise option reveals a target
 * picker rather than showing it permanently (progressive disclosure).
 */
export default function BulkBar({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [action, setAction] = useState("");

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
        Tick rows in the table below, then apply.
      </p>
    </div>
  );
}
