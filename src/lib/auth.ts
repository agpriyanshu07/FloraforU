import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

/**
 * Admin-only, session-cookie authentication. There is deliberately no
 * customer-facing account system anywhere on this site — the only thing this
 * protects is /admin.
 */
const COOKIE = "ffu_admin_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short (needs 32+ chars). See .env.example.",
    );
  }
  return new TextEncoder().encode(value);
}

export type Session = { userId: string; email: string; name: string; role: string };

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<Session | null> {
  const user = await db.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;
  if (!(await bcrypt.compare(password, user.passwordHash))) return null;
  return { userId: user.id, email: user.email, name: user.name, role: user.role };
}

export async function createSession(session: Session) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: String(payload.name),
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export const SESSION_COOKIE = COOKIE;
