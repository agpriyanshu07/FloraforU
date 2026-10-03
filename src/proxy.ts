import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Gate for the whole admin portal. Everything under /admin except the login
 * screen requires a valid session; there is no public sign-up route anywhere
 * in this application.
 *
 * Proxy runs on Node.js in Next 16, so this does the full check — including
 * the database lookup that makes a password change revoke old sessions —
 * rather than only verifying the cookie's signature.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = Boolean(await verifySessionToken(token).catch(() => null));

  if (!valid && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    const response = NextResponse.redirect(url);
    // A revoked or expired cookie is useless; clear it rather than re-check it
    // on every request.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (valid && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
