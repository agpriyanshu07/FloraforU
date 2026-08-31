"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { importAction, type ImportState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Reading the file…" : "Upload and import"}
    </button>
  );
}

export default function ImportForm() {
  const [state, formAction] = useActionState<ImportState, FormData>(importAction, {});
  const r = state.result;

  return (
    <>
      <form action={formAction} className="card space-y-4 p-5">
        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
            {state.error}
          </p>
        )}

        <div>
          <label htmlFor="file" className="field-label">
            Spreadsheet file (.csv or .xlsx)
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,.xlsx,.xls"
            required
            className="field py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-rose-100 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-rose-700"
          />
          <span className="field-hint">Up to 2,000 rows and 5 MB per file.</span>
        </div>

        <label className="flex items-start gap-3">
          <input type="checkbox" name="dryRun" defaultChecked className="mt-1 h-5 w-5 accent-[#9b2c5a]" />
          <span>
            <span className="block text-sm font-semibold">Check the file first (dry run)</span>
            <span className="block text-[13px] text-ink-600">
              Validates every row and shows the errors without changing anything. Untick to import for real.
            </span>
          </span>
        </label>

        <Submit />
      </form>

      {r && (
        <section aria-labelledby="import-result" className="mt-6">
          <h2 id="import-result" className="font-display text-2xl">
            {state.dryRun ? "Dry run results" : "Import results"}
          </h2>

          <dl className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ["Rows read", r.totalRows],
              [state.dryRun ? "Would import" : "Created", r.imported],
              [state.dryRun ? "—" : "Updated", state.dryRun ? "—" : r.updated],
              ["Skipped", r.skipped],
            ].map(([label, value]) => (
              <div key={String(label)} className="card p-4">
                <dt className="text-sm text-ink-600">{label}</dt>
                <dd className="mt-1 font-display text-2xl text-rose-600">{value}</dd>
              </div>
            ))}
          </dl>

          {r.errors.length > 0 ? (
            <>
              <h3 className="mt-6 font-display text-xl">
                {r.errors.length} row problem{r.errors.length === 1 ? "" : "s"}
              </h3>
              <p className="mt-1 text-sm text-ink-600">
                These rows were skipped — everything else went through. Fix them in your
                spreadsheet and re-upload just those rows.
              </p>
              <div className="card mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-line bg-rose-50/60 text-[12px] uppercase tracking-wider text-ink-600">
                    <tr>
                      <th scope="col" className="px-4 py-3">Row</th>
                      <th scope="col" className="px-4 py-3">Column</th>
                      <th scope="col" className="px-4 py-3">Value</th>
                      <th scope="col" className="px-4 py-3">Problem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {r.errors.slice(0, 100).map((e, i) => (
                      <tr key={`${e.row}-${e.field}-${i}`}>
                        <td className="px-4 py-2.5 font-mono">{e.row}</td>
                        <td className="px-4 py-2.5 font-medium">{e.field}</td>
                        <td className="px-4 py-2.5 font-mono text-[13px] text-ink-600">
                          {e.raw || <em>(blank)</em>}
                        </td>
                        <td className="px-4 py-2.5 text-red-700">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {r.errors.length > 100 && (
                <p className="mt-2 text-sm text-ink-600">
                  Showing the first 100 of {r.errors.length} problems.
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 rounded-lg bg-sage-50 p-3 text-sm font-medium text-sage-700">
              Every row passed validation.
              {state.dryRun && " Untick “Check the file first” and upload again to import for real."}
            </p>
          )}

          {!state.dryRun && r.imported + r.updated > 0 && (
            <Link href="/admin/products" className="btn-primary mt-5">
              View the products list
            </Link>
          )}
        </section>
      )}
    </>
  );
}
