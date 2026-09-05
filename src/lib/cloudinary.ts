import "server-only";
import { createHash } from "node:crypto";

/**
 * Signed direct-to-Cloudinary uploads.
 *
 * The browser sends the file straight to Cloudinary rather than through this
 * app: serverless request bodies are capped at 4.5 MB and a photo off a phone
 * is routinely larger than that. What the server does is sign the upload, so
 * only a logged-in admin can put files in the account.
 *
 * Cloudinary resizes and compresses on delivery, which is why the transform is
 * baked into the folder's URLs rather than being done here.
 */

export const CLOUDINARY_FOLDER = "floralforu/products";

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

/**
 * Returns null when the account isn't configured yet, which is a supported
 * state: the admin falls back to pasting URLs and nothing breaks.
 */
export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

/**
 * Cloudinary signs the alphabetically sorted `key=value` pairs joined by `&`,
 * with the API secret appended, hashed with SHA-1. The secret is never part of
 * the signed string's visible params and never reaches the browser.
 */
export function signUploadParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}
