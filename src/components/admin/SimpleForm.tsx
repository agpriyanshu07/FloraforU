"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin-actions";

export type FieldSpec =
  | { kind: "text"; name: string; label: string; hint?: string; required?: boolean; placeholder?: string; mono?: boolean }
  | { kind: "textarea"; name: string; label: string; hint?: string; required?: boolean; rows?: number; placeholder?: string }
  | { kind: "number"; name: string; label: string; hint?: string; min?: number; max?: number }
  | { kind: "select"; name: string; label: string; hint?: string; options: { value: string; label: string }[] }
  | { kind: "checkbox"; name: string; label: string; hint?: string };

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * Shared form renderer for the simpler admin modules (reviews, gallery). Keeps
 * label/hint/error markup and its ARIA wiring identical everywhere instead of
 * being re-typed per module.
 */
export default function SimpleForm({
  action,
  title,
  fields,
  values,
  submitLabel,
  cancelHref,
  id,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  fields: FieldSpec[];
  values: Record<string, string | number | boolean | undefined>;
  submitLabel: string;
  cancelHref?: string;
  id?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  // React clears the form after a rejected action — re-apply what was typed.
  const sent = state.values;
  const val = (n: string) => (sent ? (sent[n] ?? "") : (values[n] ?? ""));

  // Selects and checkboxes are controlled: React's post-action form reset
  // restores their DOM defaults, so an echoed defaultValue never reaches them.
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields
        .filter((f) => f.kind === "select")
        .map((f) => [f.name, sent ? (sent[f.name] ?? "") : String(values[f.name] ?? "")]),
    ),
  );
  const [ticks, setTicks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      fields
        .filter((f) => f.kind === "checkbox")
        .map((f) => [f.name, sent ? sent[f.name] === "on" : Boolean(values[f.name])]),
    ),
  );

  return (
    <form key={state.nonce ?? "initial"} action={formAction} className="card space-y-4 p-5">
      {id && <input type="hidden" name="id" value={id} />}

      <h2 className="font-display text-xl">{title}</h2>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      {fields.map((f) => {
        const fieldId = `f-${f.name}`;
        const invalid = err(f.name)
          ? { "aria-invalid": true as const, "aria-describedby": `${fieldId}-error` }
          : {};

        if (f.kind === "checkbox") {
          return (
            <label key={f.name} className="flex items-start gap-3">
              <input
                type="checkbox"
                name={f.name}
                checked={Boolean(ticks[f.name])}
                onChange={(e) =>
                  setTicks((prev) => ({ ...prev, [f.name]: e.target.checked }))
                }
                className="mt-1 h-5 w-5 accent-[#9b2c5a]"
              />
              <span>
                <span className="block text-sm font-semibold">{f.label}</span>
                {f.hint && <span className="block text-[13px] text-ink-600">{f.hint}</span>}
              </span>
            </label>
          );
        }

        return (
          <div key={f.name}>
            <label htmlFor={fieldId} className="field-label">{f.label}</label>

            {f.kind === "textarea" ? (
              <textarea
                id={fieldId}
                name={f.name}
                rows={f.rows ?? 4}
                required={f.required}
                placeholder={f.placeholder}
                defaultValue={String(val(f.name))}
                className="field"
                {...invalid}
              />
            ) : f.kind === "select" ? (
              <select
                id={fieldId}
                name={f.name}
                value={choices[f.name] || f.options[0]?.value || ""}
                onChange={(e) =>
                  setChoices((prev) => ({ ...prev, [f.name]: e.target.value }))
                }
                className="field"
                {...invalid}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                id={fieldId}
                name={f.name}
                type={f.kind === "number" ? "number" : "text"}
                min={f.kind === "number" ? f.min : undefined}
                max={f.kind === "number" ? f.max : undefined}
                required={f.kind === "text" ? f.required : undefined}
                placeholder={f.kind === "text" ? f.placeholder : undefined}
                defaultValue={String(val(f.name))}
                className={`field ${f.kind === "text" && f.mono ? "font-mono text-[13px]" : ""}`}
                {...invalid}
              />
            )}

            {f.hint && <span className="field-hint">{f.hint}</span>}
            {err(f.name) && (
              <span id={`${fieldId}-error`} className="field-error">{err(f.name)}</span>
            )}
          </div>
        );
      })}

      <div className="flex gap-3">
        <Save label={submitLabel} />
        {cancelHref && <Link href={cancelHref} className="btn-ghost">Cancel</Link>}
      </div>
    </form>
  );
}
