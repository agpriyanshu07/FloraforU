import { db } from "./db";
import { getSettings, placeholderSettings } from "./settings";
import type { AdminCounts } from "@/components/admin/nav-items";

/**
 * The counts the admin navigation badges.
 *
 * Deliberately only things with a decision attached. "590 products" is a fact
 * about the catalogue and belongs on the dashboard; "3 reviews waiting for
 * approval" is a job, and the point of putting it in the nav is that you can
 * see it without first visiting the page it is on -- which is exactly what you
 * could not do before, since a review sits in the queue silently and the
 * public Reviews page just stays short.
 *
 * Three cheap counts on every admin request. The layout is force-dynamic
 * anyway, they run in parallel, and each is an indexed count rather than a
 * row fetch.
 */
export async function getAdminCounts(): Promise<AdminCounts> {
  const [enquiries, reviews, settings] = await Promise.all([
    db.enquiry.count({ where: { handled: false } }),
    db.review.count({ where: { status: "pending" } }),
    getSettings().then((s) => placeholderSettings(s).length),
  ]);

  return { enquiries, reviews, settings };
}
