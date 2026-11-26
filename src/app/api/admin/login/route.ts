import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/platform/password";
import { clearStaffCookie, setStaffCookie } from "@/lib/platform/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.action === "logout") {
    await clearStaffCookie();
    return NextResponse.json({ ok: true });
  }
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const staff = await db.staffUser.findUnique({ where: { email } });
  if (!staff || !verifyPassword(password, staff.password)) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  if (!staff.password.startsWith("scrypt:")) {
    await db.staffUser.update({ where: { id: staff.id }, data: { password: hashPassword(password) } });
  }
  await setStaffCookie(staff.id);
  return NextResponse.json({ staff: { id: staff.id, name: staff.name, role: staff.role } });
}
