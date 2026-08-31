"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, verifyCredentials } from "@/lib/auth";

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

  const session = await verifyCredentials(email, password);
  if (!session) {
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
