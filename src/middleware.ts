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

  // The login page decides for itself whether the visitor is already signed in.
  if (pathname === "/admin/login") return NextResponse.next();

  // Quick gate only: this checks that a staff cookie exists. The cookie's
  // signature and expiry are verified on the server by getStaff()/requireStaff().
  const staff = request.cookies.get("dz-staff")?.value;

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
