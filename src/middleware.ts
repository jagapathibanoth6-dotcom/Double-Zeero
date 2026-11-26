import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  if (pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const staff = request.cookies.get("dz-staff")?.value;

  if (pathname === "/admin/login") {
    if (staff) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  if (!staff) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Staff sign in required." }, { status: 401 });
    }
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
