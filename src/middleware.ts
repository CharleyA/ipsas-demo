import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/health") ||
    pathname.includes("_next") ||
    pathname.includes("favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Check for token in multiple places for iframe compatibility
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.split(" ")[1] 
    : request.cookies.get("token")?.value;

  // For page requests (not API), allow through and let client-side handle auth
  // This prevents redirect loops in iframe environments where cookies may not work
  if (!token && !pathname.startsWith("/api/")) {
    // Let the client-side auth provider handle the redirect
    // It can read from localStorage which works in iframes
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const decoded = await verifyToken(token);
  // TEACHER role restriction
  if (decoded?.role === "TEACHER") {
    const allowed = pathname.startsWith("/dashboard/teachers") || pathname.startsWith("/api/teachers") || pathname.startsWith("/docs") || pathname === "/dashboard";
    if (!allowed) {
      return NextResponse.redirect(new URL("/dashboard/teachers", request.url));
    }
  }

  if (!decoded) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Clone headers and add user info
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", decoded.userId);
  requestHeaders.set("x-user-email", decoded.email);
  requestHeaders.set("x-organisation-id", decoded.organisationId);
  requestHeaders.set("x-user-role", decoded.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/login
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
