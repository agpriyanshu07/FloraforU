import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  channel: z.enum(["whatsapp", "call", "instagram"]),
  productId: z.string().optional(),
  pagePath: z.string().max(300).optional(),
});

/**
 * Logs an Enquire click so the shop has a record of every conversion touch,
 * even though the conversation itself continues on WhatsApp/phone.
 * Deliberately fire-and-forget: a failure here must never block the customer.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request.headers, "enquiry"), {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const { channel, productId, pagePath } = parsed.data;

  // Only attach a productId that actually exists, so a stale client can't
  // create a dangling reference.
  const validProductId = productId
    ? (await db.product.findUnique({ where: { id: productId }, select: { id: true } }))?.id
    : undefined;

  await db.enquiry.create({
    data: {
      channel,
      productId: validProductId ?? null,
      pagePath: pagePath ?? "",
      message: "Clicked through from the website",
    },
  });

  return NextResponse.json({ ok: true });
}
