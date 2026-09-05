"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveSettingsAction, type ActionState } from "@/lib/admin-actions";
import type { SiteSettings } from "@/lib/settings";

type Field = {
  name: keyof SiteSettings;
  label: string;
  hint?: string;
  textarea?: boolean;
  mono?: boolean;
};

const GROUPS: { title: string; blurb: string; fields: Field[] }[] = [
  {
    title: "Business details",
    blurb: "Shown in the footer, on the Contact page and on the catalogue PDF cover.",
    fields: [
      { name: "businessName", label: "Business name" },
      { name: "legalName", label: "Registered trade name", hint: "Used in the footer copyright line." },
      { name: "tagline", label: "Tagline" },
      { name: "addressLine", label: "Address" },
      { name: "city", label: "City" },
      { name: "pincode", label: "PIN code" },
      { name: "hours", label: "Business hours" },
      { name: "gstin", label: "GSTIN", hint: "Leave blank to keep it off the public site." },
    ],
  },
  {
    title: "How customers reach you",
    blurb: "The WhatsApp number here powers every Enquire button on the site.",
    fields: [
      { name: "phone", label: "Phone number", hint: "Displayed as-is and used for click-to-call." },
      {
        name: "whatsapp",
        label: "WhatsApp number",
        hint: "Country code + number, digits only. e.g. 919876543210",
        mono: true,
      },
      { name: "email", label: "Email" },
      { name: "instagram", label: "Instagram profile URL", mono: true },
      {
        name: "whatsappTemplate",
        label: "Default WhatsApp message",
        textarea: true,
        hint: "Must include {product}. You can also use {code} and {url}.",
      },
      {
        name: "mapEmbedUrl",
        label: "Google Maps embed URL",
        mono: true,
        hint: "Leave blank to auto-generate a map from the address above.",
      },
    ],
  },
  {
    title: "Social proof",
    blurb: "Real numbers only — these appear on the homepage and in the footer.",
    fields: [
      { name: "followerCount", label: "Instagram followers" },
      { name: "eventsCount", label: "Events served" },
      { name: "yearsCount", label: "Years in business" },
    ],
  },
  {
    title: "SEO & PDF",
    blurb: "How the site appears in Google results and on the downloadable catalogue.",
    fields: [
      {
        name: "siteUrl",
        label: "Site URL",
        mono: true,
        hint: "The live domain, no trailing slash. Used in WhatsApp links, the sitemap and share tags.",
      },
      { name: "seoTitle", label: "Default page title" },
      { name: "seoDescription", label: "Default meta description", textarea: true },
      { name: "pdfFooter", label: "Catalogue PDF footer text" },
    ],
  },
];

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save settings"}
    </button>
  );
}

export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveSettingsAction, {});
  const err = (n: string) => state.fieldErrors?.[n];

  // React clears the form after a rejected action — re-apply what was typed.
  const sent = state.values;
  const val = (n: keyof SiteSettings) => (sent ? (sent[n] ?? "") : settings[n]);

  return (
    <form key={state.nonce ?? "initial"} action={formAction} className="space-y-6">
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-lg bg-sage-50 p-3 text-sm font-medium text-sage-700">
          {state.success}
        </p>
      )}

      <section className="card p-5">
        <h2 className="font-display text-xl">Instagram comments</h2>
        <p className="mt-1 text-[13px] text-ink-600">
          Off by default. When on, reviews you&apos;ve saved with a link to an
          Instagram post are shown in their own &ldquo;From Instagram&rdquo;
          section, each linking back to the original comment.
        </p>
        <label className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            name="instagramCommentsEnabled"
            defaultChecked={val("instagramCommentsEnabled") === "true"}
            className="mt-1 h-5 w-5 accent-[#9b2c5a]"
          />
          <span>
            <span className="block text-sm font-semibold">
              Show the &ldquo;From Instagram&rdquo; section
            </span>
            <span className="block text-[13px] text-ink-600">
              Only quote a comment with the commenter&apos;s knowledge, and keep the
              wording exactly as they left it. Untick to hide the whole section
              instantly, without deleting anything.
            </span>
          </span>
        </label>
      </section>

      {GROUPS.map((group) => (
        <section key={group.title} className="card p-5">
          <h2 className="font-display text-xl">{group.title}</h2>
          <p className="mt-1 text-[13px] text-ink-600">{group.blurb}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {group.fields.map((f) => (
              <div key={f.name} className={f.textarea ? "sm:col-span-2" : undefined}>
                <label htmlFor={f.name} className="field-label">{f.label}</label>
                {f.textarea ? (
                  <textarea
                    id={f.name}
                    name={f.name}
                    rows={3}
                    defaultValue={val(f.name)}
                    className="field"
                    aria-invalid={err(f.name) ? true : undefined}
                    aria-describedby={err(f.name) ? `${f.name}-error` : undefined}
                  />
                ) : (
                  <input
                    id={f.name}
                    name={f.name}
                    defaultValue={val(f.name)}
                    className={`field ${f.mono ? "font-mono text-[13px]" : ""}`}
                    aria-invalid={err(f.name) ? true : undefined}
                    aria-describedby={err(f.name) ? `${f.name}-error` : undefined}
                  />
                )}
                {f.hint && <span className="field-hint">{f.hint}</span>}
                {err(f.name) && (
                  <span id={`${f.name}-error`} className="field-error">{err(f.name)}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <Save />
    </form>
  );
}
