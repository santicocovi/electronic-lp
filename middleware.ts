import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req as NextRequest & { auth: { user?: { role?: string } } | null };
  const isLoggedIn = !!session;
  const role = session?.user?.role;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isProtectedRoute = ["/profile", "/checkout", "/wishlist"].some((p) =>
    nextUrl.pathname.startsWith(p)
  );

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${nextUrl.pathname}`, nextUrl));
    }
    if (role !== "ADMIN" && role !== "SUPERADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=${nextUrl.pathname}`, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|videos|sitemap.xml|robots.txt).*)",
  ],
};
