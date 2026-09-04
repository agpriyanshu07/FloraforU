"use server";

import { requireSession } from "./auth";
import {
  CLOUDINARY_FOLDER,
  getCloudinaryConfig,
  signUploadParams,
} from "./cloudinary";

export type UploadTicket =
  | {
      ok: true;
      url: string;
      apiKey: string;
      timestamp: number;
      folder: string;
      signature: string;
    }
  | { ok: false; error: string };

/**
 * Hands the browser a short-lived signature so it can upload one file directly
 * to Cloudinary. Guarded by the admin session — without this an open upload
 * endpoint would let anyone fill the account.
 */
export async function createUploadTicket(): Promise<UploadTicket> {
  await requireSession();

  const config = getCloudinaryConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "Image uploads aren't set up yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, then redeploy. You can paste image URLs in the meantime.",
    };
  }

  // Cloudinary rejects a signature whose timestamp is more than an hour old,
  // so a leaked ticket stops working on its own.
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signUploadParams(
    { folder: CLOUDINARY_FOLDER, timestamp },
    config.apiSecret,
  );

  return {
    ok: true,
    url: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    apiKey: config.apiKey,
    timestamp,
    folder: CLOUDINARY_FOLDER,
    signature,
  };
}
