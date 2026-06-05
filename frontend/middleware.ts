// ========================
// middleware.ts  (must live at root of app/ or project root)
// Next.js middleware — runs on every request BEFORE the page loads
//
// CONCEPT: Middleware in Next.js
// This file intercepts every request server-side.
// If someone visits /dashboard without a token → redirect to /auth/login.
// This is faster than client-side auth checks (no flash of protected content).
// ========================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't need auth
const PUBLIC_ROUTES = ["/auth/login", "/auth/signup", "/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  if (isPublic) return NextResponse.next();

  // Check for access token in cookies (for SSR)
  // Note: localStorage is client-only, so we use cookies as a secondary signal
  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    // No token — redirect to login
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("from", pathname); // remember where they were going
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static files and API routes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
