import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getStaff } from "@/lib/platform/session";

export async function POST(request: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo." }, { status: 400 });

  const ext = path.extname(file.name || "").toLowerCase() || ".jpg";
  if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return NextResponse.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "public", "uploads", "menu");
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-]+/gi, "-").toLowerCase()}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ photo: `/uploads/menu/${filename}` });
}
