import { NextResponse } from "next/server";
import { clearStaffCookie } from "@/lib/platform/session";

export async function POST(request: Request) {
  await clearStaffCookie();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}
