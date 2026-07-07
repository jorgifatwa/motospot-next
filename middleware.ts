// ────────────────────────────────
// Next.js Middleware
// ARCHITECTURE.md Section 6 — protect dashboard routes
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/api/auth"];

  const isPublicRoute = publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route));

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!req.auth) {
    // Redirect to login page
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Allow authenticated users to access dashboard
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
