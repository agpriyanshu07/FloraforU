"use client";

import { useState } from "react";
import { StarIcon } from "./icons";

type Errors = Record<string, string>;

/**
 * On-site review submission. Structured to match ContactForm — same fetch/error
 * shape, same honeypot, same field markup — so there is one form pattern in
 * this codebase rather than two.
 *
 * The copy is deliberately clear that a review is checked before it appears.
 * Implying it publishes instantly would be a small lie the moderation queue
 * then contradicts.
 */
export default function ReviewForm({
  productSlug,
  productName,
}: {
  /** Present on a product page, so the review is tied to that product. */
  productSlug?: string;
  productName?: string;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [rating, setRating] = useState(5);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setErrors({});
    setFormError("");

    const data = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const res = await fetch("/api/reviews", {
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
            : "Something went wrong. Please send your review on WhatsApp instead."),
      );
    } catch {
      setFormError(
        "We couldn't send that — please check your connection, or send it on WhatsApp.",
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="card p-6" role="status">
        <h3 className="font-display text-xl">Thanks — we&apos;ve got your review</h3>
        <p className="mt-2 text-ink-600">
          We read every review before it goes up, so it won&apos;t appear on the site
          straight away. If we need to check anything we&apos;ll message you first.
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
      <h2 className="font-display text-2xl">
        {productName ? `Review ${productName}` : "Write a review"}
      </h2>
      <p className="mt-1 text-sm text-ink-600">
        Ordered from us before? Tell other customers how it went. We check each
        review before publishing it, so there may be a day&apos;s delay.
      </p>

      {formError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {formError}
        </p>
      )}

      {productSlug && <input type="hidden" name="productSlug" value={productSlug} />}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customerName" className="field-label">
            Your name
          </label>
          <input
            id="customerName"
            name="customerName"
            required
            className="field"
            autoComplete="name"
            placeholder="e.g. Ritu S."
            {...field("customerName")}
          />
          <span className="field-hint">First name and an initial is fine.</span>
          {errors.customerName && (
            <span id="customerName-error" className="field-error">
              {errors.customerName}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="eventType" className="field-label">
            What was it for? <span className="font-normal text-ink-600">(optional)</span>
          </label>
          <input
            id="eventType"
            name="eventType"
            className="field"
            placeholder="e.g. Wedding — Dhanbad"
            {...field("eventType")}
          />
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="field-label">Your rating</legend>
        <input type="hidden" name="rating" value={rating} />
        <div className="mt-1 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-pressed={rating === n}
              // 44px target: a 5-star row is otherwise a classic mis-tap on a phone.
              className="grid h-11 w-11 place-items-center rounded-full text-marigold-600 hover:bg-marigold-50"
            >
              <StarIcon filled={n <= rating} />
              <span className="sr-only">{n} out of 5</span>
            </button>
          ))}
          <span aria-hidden className="ml-2 text-sm text-ink-600">
            {rating} / 5
          </span>
        </div>
        {errors.rating && (
          <span id="rating-error" className="field-error">
            {errors.rating}
          </span>
        )}
      </fieldset>

      <div className="mt-4">
        <label htmlFor="quote" className="field-label">
          Your review
        </label>
        <textarea
          id="quote"
          name="quote"
          rows={5}
          required
          className="field"
          placeholder="What did you order, and how did it go? Anything about delivery, packing or the rates is useful to other customers."
          {...field("quote")}
        />
        {errors.quote && (
          <span id="quote-error" className="field-error">
            {errors.quote}
          </span>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="contactHint" className="field-label">
          Phone or email <span className="font-normal text-ink-600">(optional)</span>
        </label>
        <input
          id="contactHint"
          name="contactHint"
          className="field"
          autoComplete="tel"
          {...field("contactHint")}
        />
        <span className="field-hint">
          Only so we can check back with you if something needs clarifying. It is
          never shown on the site.
        </span>
      </div>

      {/* Honeypot — hidden from people, irresistible to bots. */}
      <div aria-hidden className="absolute left-[-9999px]">
        <label htmlFor="review-website">Leave this empty</label>
        <input id="review-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" className="btn-primary mt-6 w-full sm:w-auto" disabled={sending}>
        {sending ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
