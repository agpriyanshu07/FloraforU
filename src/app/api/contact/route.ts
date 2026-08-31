import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(80),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can reach you on.")
    .max(20),
  email: z.union([z.string().trim().email("That email doesn't look right."), z.literal("")]),
  message: z
    .string()
    .trim()
    .min(10, "Please add a little detail — what are you looking for?")
    .max(2000),
  // Honeypot: a real person never fills this in.
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request.headers, "contact"), {
    limit: 5,
    windowMs: 10 * 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        formError: `Too many messages sent. Please try again in ${limit.retryAfter} seconds, or message us on WhatsApp.`,
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

  await db.enquiry.create({
    data: {
      channel: "form",
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      message: parsed.data.message,
      pagePath: "/contact",
    },
  });

  return NextResponse.json({ ok: true });
}
