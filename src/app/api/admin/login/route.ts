import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/platform/password";
import { clearStaffCookie, setStaffCookie } from "@/lib/platform/session";
import { clientIp, rateLimit } from "@/lib/platform/rate-limit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.action === "logout") {
    await clearStaffCookie();
    return NextResponse.json({ ok: true });
  }
  if (!rateLimit(`staff-login:${clientIp(request)}`, 10, 15 * 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const staff = await db.staffUser.findUnique({ where: { email } });
  const check = verifyPassword(password, staff?.password);
  if (!staff || !check.ok) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  if (check.needsRehash) {
    await db.staffUser.update({ where: { id: staff.id }, data: { password: hashPassword(password) } });
  }
  await setStaffCookie(staff.id);
  return NextResponse.json({ staff: { id: staff.id, name: staff.name, role: staff.role } });
}
