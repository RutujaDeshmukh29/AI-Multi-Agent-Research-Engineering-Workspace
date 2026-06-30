import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/auth/login", "/auth/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always pass through Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Always pass through public auth routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Check for auth cookie — redirect to login if missing
  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.png).*)"],
};
