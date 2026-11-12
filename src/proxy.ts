import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only: bounces visitors without a session cookie away from private areas
 * before any rendering. Real authorisation (session validity + role) happens server-side in
 * every page, server action and route handler through src/lib/server/auth.ts.
 */
const PRIVATE = ["/dashboard", "/practice", "/admin", "/account", "/notifications"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("calme_session")?.value);

  if (!hasSession && PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (PRIVATE.some((p) => pathname.startsWith(p))) res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|icon.png|favicon.ico).*)"],
};
