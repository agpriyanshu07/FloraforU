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
import { SESSION_COOKIE as COOKIE } from "./session-cookie";
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

type SessionClaims = { userId: string; sessionVersion: number };

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
  const user = await db.adminUser.findUnique({
    where: { id: session.userId },
    select: { sessionVersion: true },
  });
  const claims: SessionClaims = {
    userId: session.userId,
    sessionVersion: user?.sessionVersion ?? 0,
  };
  const token = await new SignJWT(claims)
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

/**
 * Checks a session token end to end: the signature, then that the admin still
 * exists and their password hasn't changed since the token was issued. Name and
 * role come from the database, so an edit takes effect without signing out.
 *
 * Shared by getSession() and src/proxy.ts so the two can't drift apart.
 */
export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  let claims: SessionClaims;
  try {
    const { payload } = await jwtVerify(token, secret());
    claims = {
      userId: String(payload.userId),
      sessionVersion: Number(payload.sessionVersion ?? 0),
    };
  } catch {
    return null;
  }

  const user = await db.adminUser.findUnique({ where: { id: claims.userId } });
  if (!user || user.sessionVersion !== claims.sessionVersion) return null;
  return { userId: user.id, email: user.email, name: user.name, role: user.role };
}

export async function getSession(): Promise<Session | null> {
  return verifySessionToken((await cookies()).get(COOKIE)?.value);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export { COOKIE as SESSION_COOKIE };
