import "./polyfill";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/auth/login", "/auth/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through public auth routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Pass through Next.js internals, API routes, and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
