import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * Public review submission.
 *
 * Nothing posted here reaches the site on its own: every row lands as
 * status "pending" and visible false, and only an admin approval in
 * /admin/reviews publishes it. That is the entire safety model for opening a
 * public write endpoint on a site whose main trust signal is its reviews.
 */
const schema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Please add your name, or just your first name and initial.")
    .max(80),
  eventType: z.string().trim().max(120).default(""),
  quote: z
    .string()
    .trim()
    .min(20, "Please add a bit more detail — what did you order, and how did it go?")
    .max(2000),
  rating: z.coerce
    .number()
    .int()
    .min(1, "Please pick a rating from 1 to 5.")
    .max(5, "Please pick a rating from 1 to 5."),
  productSlug: z.string().trim().max(120).default(""),
  // Admin-only, never rendered publicly. See the schema comment on contactHint.
  contactHint: z.string().trim().max(120).default(""),
  // Honeypot: a real person never fills this in. Accepted by the schema on
  // purpose — rejecting it here would return a validation error and teach a bot
  // exactly which field caught it. It is checked after parsing instead, and a
  // filled one gets a normal-looking success response.
  website: z.string().optional(),
});

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request.headers, "reviews"), {
    limit: 3,
    windowMs: 60 * 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        formError: `That's a few reviews in a short while. Please try again in ${limit.retryAfter} seconds, or send it to us on WhatsApp.`,
      },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, fieldErrors }, { status: 400 });
  }

  if (parsed.data.website) {
    // Silently accept and drop spam so the bot doesn't learn it was caught.
    return NextResponse.json({ ok: true });
  }

  const d = parsed.data;

  // A slug that doesn't resolve is dropped rather than rejected: the review
  // itself is still worth keeping, it just won't be tied to a product.
  const product = d.productSlug
    ? await db.product.findUnique({
        where: { slug: d.productSlug },
        select: { id: true },
      })
    : null;

  await db.review.create({
    data: {
      customerName: d.customerName,
      eventType: d.eventType,
      quote: d.quote,
      rating: d.rating,
      source: "Website",
      status: "pending",
      // Belt and braces: status gates the public queries, and visible keeps it
      // out of any query that only checks the older flag.
      visible: false,
      submittedByCustomer: true,
      contactHint: d.contactHint || null,
      productId: product?.id ?? null,
    },
  });

  // Deliberately no revalidation here: the row is invisible until approved, so
  // there is nothing new for the public pages to show. The admin queue is
  // force-dynamic and picks it up on its next load.
  return NextResponse.json({ ok: true });
}
