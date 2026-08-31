"use client";

import { useState } from "react";

type Errors = Record<string, string>;

/**
 * Backup channel for people who don't use WhatsApp. Submissions land in the
 * admin Enquiries log rather than only in an inbox, so nothing gets lost.
 */
export default function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setErrors({});
    setFormError("");

    const data = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();

      if (res.ok && body.ok) {
        setSent(true);
        return;
      }
      setErrors(body.fieldErrors ?? {});
      setFormError(
        body.formError ??
          (body.fieldErrors
            ? "Please check the highlighted fields and try again."
            : "Something went wrong. Please message us on WhatsApp instead."),
      );
    } catch {
      setFormError(
        "We couldn't send that — please check your connection, or message us on WhatsApp.",
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="card p-6" role="status">
        <h3 className="font-display text-xl">Message received</h3>
        <p className="mt-2 text-ink-600">
          Thanks — we&apos;ve got it. We usually reply the same day during shop
          hours. If it&apos;s urgent, WhatsApp is faster.
        </p>
      </div>
    );
  }

  const field = (name: string) =>
    errors[name]
      ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` }
      : {};

  return (
    <form onSubmit={onSubmit} noValidate className="card p-6">
      <h2 className="font-display text-2xl">Send us a message</h2>
      <p className="mt-1 text-sm text-ink-600">
        Prefer not to use WhatsApp? Fill this in and we&apos;ll get back to you.
      </p>

      {formError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {formError}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="field-label">
            Your name
          </label>
          <input id="name" name="name" required className="field" autoComplete="name" {...field("name")} />
          {errors.name && (
            <span id="name-error" className="field-error">
              {errors.name}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="field-label">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="field"
            autoComplete="tel"
            {...field("phone")}
          />
          {errors.phone && (
            <span id="phone-error" className="field-error">
              {errors.phone}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="email" className="field-label">
          Email <span className="font-normal text-ink-600">(optional)</span>
        </label>
        <input id="email" name="email" type="email" className="field" autoComplete="email" {...field("email")} />
        {errors.email && (
          <span id="email-error" className="field-error">
            {errors.email}
          </span>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="message" className="field-label">
          What are you looking for?
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="field"
          placeholder="e.g. Need marigold lardi and 2 fog machines for a wedding on the 14th in Dhanbad."
          {...field("message")}
        />
        <span className="field-hint">
          Dates, quantities and your venue city help us quote accurately.
        </span>
        {errors.message && (
          <span id="message-error" className="field-error">
            {errors.message}
          </span>
        )}
      </div>

      {/* Honeypot — hidden from people, irresistible to bots. */}
      <div aria-hidden className="absolute left-[-9999px]">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" className="btn-primary mt-6 w-full sm:w-auto" disabled={sending}>
        {sending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
