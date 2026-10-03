"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession, verifyCredentials } from "@/lib/auth";
import { clientKey, rateLimit, rateLimitStatus } from "@/lib/rate-limit";

/**
 * Failed sign-ins allowed per window, counted per address and per account.
 * Successful sign-ins never count, so the owner is only ever locked out by
 * someone (or something) getting the password wrong.
 */
const LOGIN_LIMIT = { limit: 5, windowMs: 15 * 60_000 };

function lockedMessage(retryAfter: number) {
  const minutes = Math.ceil(retryAfter / 60);
  return `Too many wrong attempts. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
}

export type LoginState = { error?: string; email?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { error: "Enter both your email and password.", email };
  }

  const keys = [
    clientKey(await headers(), "login"),
    `login-account:${email.trim().toLowerCase()}`,
  ];
  for (const key of keys) {
    const status = await rateLimitStatus(key, LOGIN_LIMIT);
    if (!status.ok) return { error: lockedMessage(status.retryAfter), email };
  }

  const session = await verifyCredentials(email, password);
  if (!session) {
    const hits = await Promise.all(keys.map((key) => rateLimit(key, LOGIN_LIMIT)));
    const blocked = hits.find((hit) => !hit.ok);
    if (blocked) return { error: lockedMessage(blocked.retryAfter), email };

    // Deliberately vague — don't reveal whether the email exists.
    // React resets uncontrolled form fields after a server action, so the email
    // is echoed back and re-applied — otherwise a mistyped password would make
    // the admin retype both fields.
    return { error: "That email and password don't match. Please try again.", email };
  }

  await createSession(session);
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
