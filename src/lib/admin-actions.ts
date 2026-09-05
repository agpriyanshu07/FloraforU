"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { refreshPublicPages } from "@/lib/revalidate";
import { OFFER_THEME_NAMES } from "@/lib/offers";
import { db } from "./db";
import { requireSession } from "./auth";
import { slugify } from "./format";
import { saveSettings, type SiteSettings } from "./settings";

export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  /**
   * Everything the admin typed, echoed back. React resets uncontrolled form
   * fields once a server action resolves, so without this a single validation
   * error would wipe a long product form. Every form below re-applies these as
   * its defaults.
   */
  values?: Record<string, string>;
  /**
   * Changes on every rejected submit. Forms use it as a React `key` so they
   * remount and pick up `values` as their defaults — React's post-action
   * form.reset() otherwise desyncs selects and checkboxes.
   */
  nonce?: number;
};

/** Every mutation in this file goes through here first. */
async function guard() {
  await requireSession();
}

/** Snapshots the submitted form so a rejected submit can be re-rendered. */
function snapshot(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (key === "productIds" || key === "ids") {
      out[key] = out[key] ? `${out[key]},${value}` : value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function collectErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}


/** Ensures a slug is unique within a model, appending -2, -3 … as needed. */
async function uniqueSlug(
  model: "product" | "category" | "offer",
  base: string,
  excludeId?: string,
): Promise<string> {
  const seed = slugify(base);
  let candidate = seed;
  let n = 2;
  for (;;) {
    const existing =
      model === "product"
        ? await db.product.findUnique({ where: { slug: candidate }, select: { id: true } })
        : model === "category"
          ? await db.category.findUnique({ where: { slug: candidate }, select: { id: true } })
          : await db.offer.findUnique({ where: { slug: candidate }, select: { id: true } });

    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${seed}-${n++}`;
  }
}

// ============================================================== PRODUCTS ===

const productSchema = z.object({
  name: z.string().trim().min(2, "Give the product a name (2+ characters)."),
  categoryId: z.string().min(1, "Pick a category."),
  spec: z.string().trim().max(300, "Keep the spec line under 300 characters.").default(""),
  description: z.string().trim().max(4000).default(""),
  code: z.string().trim().max(40).default(""),
  priceOnEnquiry: z.boolean(),
  price: z.number().nonnegative("Price can't be negative.").nullable(),
  availability: z.enum(["in_stock", "limited", "made_to_order"]),
  published: z.boolean(),
  isNew: z.boolean(),
  newDays: z.number().int().min(0).max(365),
  slug: z.string().trim().default(""),
  imageUrls: z.string().default(""),
});

function readProductForm(formData: FormData) {
  const priceOnEnquiry = formData.get("priceOnEnquiry") === "on";
  const rawPrice = String(formData.get("price") ?? "").trim();

  return productSchema
    .superRefine((value, ctx) => {
      if (!value.priceOnEnquiry && value.price === null) {
        ctx.addIssue({
          code: "custom",
          path: ["price"],
          message: 'Enter a price, or tick "Price on Enquiry".',
        });
      }
    })
    .safeParse({
      name: String(formData.get("name") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      spec: String(formData.get("spec") ?? ""),
      description: String(formData.get("description") ?? ""),
      code: String(formData.get("code") ?? ""),
      priceOnEnquiry,
      price: priceOnEnquiry || rawPrice === "" ? null : Number(rawPrice),
      availability: String(formData.get("availability") ?? "in_stock"),
      published: formData.get("published") === "on",
      isNew: formData.get("isNew") === "on",
      newDays: Number(formData.get("newDays") ?? 21),
      slug: String(formData.get("slug") ?? ""),
      imageUrls: String(formData.get("imageUrls") ?? ""),
    });
}

async function writeImages(productId: string, raw: string, productName: string) {
  const urls = raw
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 6);

  await db.productImage.deleteMany({ where: { productId } });
  if (urls.length === 0) return;

  await db.productImage.createMany({
    data: urls.map((url, i) => ({
      productId,
      url,
      alt: `${productName} — photo ${i + 1} of ${urls.length}, FloralforU`,
      position: i,
      isPrimary: i === 0,
    })),
  });
}

export async function saveProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await guard();

  const id = String(formData.get("id") ?? "");
  const parsed = readProductForm(formData);

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: collectErrors(parsed.error),
      values: snapshot(formData),
      nonce: Date.now(),
    };
  }

  const d = parsed.data;
  const slug = await uniqueSlug("product", d.slug || d.name, id || undefined);
  const newUntil =
    d.isNew && d.newDays > 0
      ? new Date(Date.now() + d.newDays * 24 * 60 * 60 * 1000)
      : null;

  const data = {
    name: d.name,
    slug,
    code: d.code || null,
    spec: d.spec,
    description: d.description,
    price: d.priceOnEnquiry ? null : d.price,
    priceOnEnquiry: d.priceOnEnquiry,
    availability: d.availability,
    published: d.published,
    isNew: d.isNew,
    newUntil,
    categoryId: d.categoryId,
  };

  const product = id
    ? await db.product.update({ where: { id }, data })
    : await db.product.create({ data });

  await writeImages(product.id, d.imageUrls, product.name);

  refreshPublicPages();
  revalidatePath(`/product/${slug}`);
  revalidatePath("/admin/products");
  redirect(`/admin/products?saved=${encodeURIComponent(product.name)}`);
}

export async function deleteProductAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.product.delete({ where: { id } });
  refreshPublicPages();
  revalidatePath("/admin/products");
  redirect("/admin/products?deleted=1");
}

export async function bulkProductAction(formData: FormData) {
  await guard();

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const action = String(formData.get("bulkAction") ?? "");
  const targetCategory = String(formData.get("bulkCategoryId") ?? "");

  if (ids.length === 0 || !action) {
    redirect("/admin/products?error=nothing-selected");
  }

  switch (action) {
    case "publish":
      await db.product.updateMany({ where: { id: { in: ids } }, data: { published: true } });
      break;
    case "unpublish":
      await db.product.updateMany({ where: { id: { in: ids } }, data: { published: false } });
      break;
    case "recategorise":
      if (!targetCategory) redirect("/admin/products?error=no-target-category");
      await db.product.updateMany({
        where: { id: { in: ids } },
        data: { categoryId: targetCategory },
      });
      break;
    case "delete":
      await db.product.deleteMany({ where: { id: { in: ids } } });
      break;
    default:
      redirect("/admin/products?error=unknown-action");
  }

  refreshPublicPages();
  revalidatePath("/admin/products");
  redirect(`/admin/products?bulk=${action}&count=${ids.length}`);
}

// ============================================================ CATEGORIES ===

const categorySchema = z.object({
  name: z.string().trim().min(2, "Give the category a name."),
  description: z
    .string()
    .trim()
    .min(10, "Write a sentence or two — this shows on the site and helps Google.")
    .max(600),
  imageUrl: z.string().trim().default(""),
  displayOrder: z.number().int().min(0),
});

export async function saveCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await guard();

  const id = String(formData.get("id") ?? "");
  const parsed = categorySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    displayOrder: Number(formData.get("displayOrder") ?? 0),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: collectErrors(parsed.error),
      values: snapshot(formData),
      nonce: Date.now(),
    };
  }

  const d = parsed.data;
  const slug = await uniqueSlug("category", d.name, id || undefined);
  const data = {
    name: d.name,
    slug,
    description: d.description,
    imageUrl: d.imageUrl || null,
    displayOrder: d.displayOrder,
  };

  if (id) {
    await db.category.update({ where: { id }, data });
  } else {
    await db.category.create({ data });
  }

  refreshPublicPages();
  revalidatePath("/admin/categories");
  redirect(`/admin/categories?saved=${encodeURIComponent(d.name)}`);
}

/**
 * A category with live products can never be deleted silently — the admin must
 * either reassign those products or the delete is refused. Orphaned products
 * would disappear from the site with no trace.
 */
export async function deleteCategoryAction(formData: FormData) {
  await guard();

  const id = String(formData.get("id") ?? "");
  const reassignTo = String(formData.get("reassignTo") ?? "");
  if (!id) return;

  const count = await db.product.count({ where: { categoryId: id } });

  if (count > 0) {
    if (!reassignTo || reassignTo === id) {
      redirect(`/admin/categories?blocked=${id}&count=${count}`);
    }
    await db.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: reassignTo },
    });
  }

  await db.category.delete({ where: { id } });
  refreshPublicPages();
  revalidatePath("/admin/categories");
  redirect(`/admin/categories?deleted=1&moved=${count}`);
}

// ================================================================ OFFERS ===

const offerSchema = z.object({
  title: z.string().trim().min(2, "Name the campaign, e.g. “Ganesh Puja Sale”."),
  description: z.string().trim().max(1000).default(""),
  bannerUrl: z.string().trim().default(""),
  startsAt: z.string().min(1, "Pick a start date."),
  endsAt: z.string().min(1, "Pick an end date."),
  published: z.boolean(),
  discountLabel: z
    .string()
    .trim()
    .max(24, "Keep it short enough to read at a glance — 24 characters or less.")
    .default(""),
  theme: z.enum(OFFER_THEME_NAMES as [string, ...string[]]),
  priority: z.number().int().min(0).max(100),
  urgentWithinHours: z
    .number()
    .int()
    .min(1, "Give the countdown at least an hour to escalate in.")
    .max(720),
});

export async function saveOfferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await guard();

  const id = String(formData.get("id") ?? "");
  const parsed = offerSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    bannerUrl: String(formData.get("bannerUrl") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    published: formData.get("published") === "on",
    discountLabel: String(formData.get("discountLabel") ?? ""),
    theme: String(formData.get("theme") ?? "marigold"),
    priority: Number(formData.get("priority") ?? 0),
    urgentWithinHours: Number(formData.get("urgentWithinHours") ?? 48),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: collectErrors(parsed.error),
      values: snapshot(formData),
      nonce: Date.now(),
    };
  }

  const d = parsed.data;
  const startsAt = new Date(d.startsAt);
  const endsAt = new Date(d.endsAt);

  if (endsAt <= startsAt) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { endsAt: "The end date must be after the start date." },
      values: snapshot(formData),
      nonce: Date.now(),
    };
  }

  const productIds = formData.getAll("productIds").map(String).filter(Boolean);
  const slug = await uniqueSlug("offer", d.title, id || undefined);

  const data = {
    title: d.title,
    slug,
    description: d.description,
    bannerUrl: d.bannerUrl || null,
    startsAt,
    endsAt,
    published: d.published,
    // Empty stays null so the badge is omitted rather than rendered blank.
    discountLabel: d.discountLabel || null,
    theme: d.theme,
    priority: d.priority,
    urgentWithinHours: d.urgentWithinHours,
  };

  const offer = id
    ? await db.offer.update({ where: { id }, data })
    : await db.offer.create({ data });

  await db.offerProduct.deleteMany({ where: { offerId: offer.id } });
  if (productIds.length > 0) {
    await db.offerProduct.createMany({
      data: productIds.map((productId) => ({ offerId: offer.id, productId })),
    });
  }

  refreshPublicPages();
  revalidatePath("/admin/offers");
  redirect(`/admin/offers?saved=${encodeURIComponent(d.title)}`);
}

export async function deleteOfferAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.offer.delete({ where: { id } });
  refreshPublicPages();
  revalidatePath("/admin/offers");
  redirect("/admin/offers?deleted=1");
}

// =============================================================== REVIEWS ===

const reviewSchema = z.object({
  customerName: z.string().trim().min(2, "Add the customer's name or initials."),
  eventType: z.string().trim().max(80).default(""),
  quote: z.string().trim().min(10, "Paste the review text (10+ characters)."),
  rating: z.number().int().min(1).max(5),
  source: z.string().trim().max(60).default(""),
  visible: z.boolean(),
  displayOrder: z.number().int().min(0),
  // Link back to the original Instagram post for a quote lifted from a
  // comment, so the attribution is checkable rather than taken on trust.
  sourceUrl: z
    .union([z.string().trim().url("That doesn't look like a full link."), z.literal("")])
    .default(""),
});

export async function saveReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await guard();

  const id = String(formData.get("id") ?? "");
  const parsed = reviewSchema.safeParse({
    customerName: String(formData.get("customerName") ?? ""),
    eventType: String(formData.get("eventType") ?? ""),
    quote: String(formData.get("quote") ?? ""),
    rating: Number(formData.get("rating") ?? 5),
    source: String(formData.get("source") ?? ""),
    visible: formData.get("visible") === "on",
    displayOrder: Number(formData.get("displayOrder") ?? 0),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: collectErrors(parsed.error),
      values: snapshot(formData),
      nonce: Date.now(),
    };
  }

  // Empty stays null so the card renders plain text rather than an empty link.
  const data = { ...parsed.data, sourceUrl: parsed.data.sourceUrl || null };

  if (id) {
    await db.review.update({ where: { id }, data });
  } else {
    await db.review.create({ data });
  }

  refreshPublicPages();
  revalidatePath("/admin/reviews");
  redirect("/admin/reviews?saved=1");
}

export async function deleteReviewAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.review.delete({ where: { id } });
  refreshPublicPages();
  revalidatePath("/admin/reviews");
  redirect("/admin/reviews?deleted=1");
}

/**
 * Moderation for customer-submitted reviews. Approving sets both flags, since
 * a submission arrives with visible:false as well as status:"pending" —
 * approving has to clear both for the review to actually appear.
 */
export async function moderateReviewAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || (decision !== "approved" && decision !== "rejected")) return;

  await db.review.update({
    where: { id },
    data: {
      status: decision,
      // A rejected review stays in the table so it can be re-read or restored;
      // it simply never renders.
      visible: decision === "approved",
    },
  });

  refreshPublicPages();
  revalidatePath("/admin/reviews");
  redirect(`/admin/reviews?moderated=${decision}`);
}

// =============================================================== GALLERY ===

const gallerySchema = z.object({
  title: z.string().trim().min(2, "Give the photo a short title."),
  kind: z.enum(["photo", "reel"]),
  tag: z.enum(["event", "dispatch", "shop"]),
  imageUrl: z.string().trim().default(""),
  embedUrl: z.string().trim().default(""),
  alt: z.string().trim().default(""),
  visible: z.boolean(),
  displayOrder: z.number().int().min(0),
});

export async function saveGalleryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await guard();

  const id = String(formData.get("id") ?? "");
  const parsed = gallerySchema
    .superRefine((v, ctx) => {
      if (v.kind === "photo" && !v.imageUrl) {
        ctx.addIssue({ code: "custom", path: ["imageUrl"], message: "A photo needs an image URL." });
      }
      if (v.kind === "reel" && !v.embedUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["embedUrl"],
          message: "Paste the Instagram post or reel link.",
        });
      }
    })
    .safeParse({
      title: String(formData.get("title") ?? ""),
      kind: String(formData.get("kind") ?? "photo"),
      tag: String(formData.get("tag") ?? "event"),
      imageUrl: String(formData.get("imageUrl") ?? ""),
      embedUrl: String(formData.get("embedUrl") ?? ""),
      alt: String(formData.get("alt") ?? ""),
      visible: formData.get("visible") === "on",
      displayOrder: Number(formData.get("displayOrder") ?? 0),
    });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: collectErrors(parsed.error),
      values: snapshot(formData),
      nonce: Date.now(),
    };
  }

  const d = parsed.data;
  const data = {
    title: d.title,
    kind: d.kind,
    tag: d.tag,
    imageUrl: d.imageUrl || null,
    embedUrl: d.embedUrl || null,
    // Alt text is never left empty — this site is almost entirely images.
    alt: d.alt || d.title,
    visible: d.visible,
    displayOrder: d.displayOrder,
  };

  if (id) {
    await db.galleryItem.update({ where: { id }, data });
  } else {
    await db.galleryItem.create({ data });
  }

  refreshPublicPages();
  revalidatePath("/admin/gallery");
  redirect("/admin/gallery?saved=1");
}

export async function deleteGalleryAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.galleryItem.delete({ where: { id } });
  refreshPublicPages();
  revalidatePath("/admin/gallery");
  redirect("/admin/gallery?deleted=1");
}

// ============================================================= HOMEPAGE ====

export async function saveHomepageAction(formData: FormData) {
  await guard();

  const featured = formData.getAll("featured").map(String).filter(Boolean);

  await db.product.updateMany({ data: { featured: false, featureOrder: 0 } });
  for (const [i, id] of featured.entries()) {
    await db.product.update({
      where: { id },
      data: { featured: true, featureOrder: i },
    });
  }

  // Category order arrives as one field per category: categoryOrder_<id>.
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("categoryOrder_")) continue;
    const id = key.slice("categoryOrder_".length);
    const position = Number(value);
    if (id && Number.isFinite(position)) {
      await db.category.update({
        where: { id },
        data: { displayOrder: Math.max(0, Math.trunc(position)) },
      });
    }
  }

  refreshPublicPages();
  revalidatePath("/admin/homepage");
  redirect("/admin/homepage?saved=1");
}

// ============================================================= ENQUIRIES ===

export async function toggleEnquiryHandledAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const handled = formData.get("handled") === "true";
  if (!id) return;

  await db.enquiry.update({ where: { id }, data: { handled: !handled } });
  revalidatePath("/admin/enquiries");
}

export async function deleteEnquiryAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.enquiry.delete({ where: { id } });
  revalidatePath("/admin/enquiries");
  redirect("/admin/enquiries?deleted=1");
}

// ============================================================== SETTINGS ===

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await guard();

  const keys: (keyof SiteSettings)[] = [
    "businessName", "legalName", "tagline", "addressLine", "city", "pincode",
    "phone", "whatsapp", "email", "hours", "gstin", "instagram", "mapEmbedUrl",
    "whatsappTemplate", "seoTitle", "seoDescription", "pdfFooter",
    "followerCount", "eventsCount", "yearsCount", "siteUrl",
  ];

  const values: Partial<SiteSettings> = {};
  for (const key of keys) {
    const raw = formData.get(key);
    if (raw !== null) values[key] = String(raw);
  }

  // Checkbox, so an unticked box sends nothing at all — it has to be read
  // separately from the text keys above or it could never be switched off.
  values.instagramCommentsEnabled =
    formData.get("instagramCommentsEnabled") === "on" ? "true" : "false";

  const whatsappDigits = (values.whatsapp ?? "").replace(/\D/g, "");
  if (whatsappDigits.length < 10) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: {
        whatsapp:
          "Enter the full number with country code and no spaces, e.g. 919876543210.",
      },
      values: snapshot(formData),
      nonce: Date.now(),
    };
  }
  values.whatsapp = whatsappDigits;

  if (values.whatsappTemplate && !values.whatsappTemplate.includes("{product}")) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: {
        whatsappTemplate:
          "The template must contain {product} so the message names the item being enquired about.",
      },
      values: snapshot(formData),
      nonce: Date.now(),
    };
  }

  await saveSettings(values);
  refreshPublicPages();
  revalidatePath("/admin/settings");
  return { success: "Settings saved. The public site has been updated." };
}
