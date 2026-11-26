import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getStaff } from "@/lib/platform/session";
import { addGalleryPhoto, deleteGalleryPhoto } from "@/lib/platform/gallery";

function refreshGallery() {
  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/manchester");
  revalidatePath("/chorlton");
  revalidatePath("/admin/gallery");
}

export async function POST(request: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const form = await request.formData();
  const action = String(form.get("action") || "add");

  if (action === "delete") {
    await deleteGalleryPhoto(String(form.get("id") || ""));
    refreshGallery();
    return NextResponse.json({ ok: true });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo." }, { status: 400 });

  const ext = path.extname(file.name || "").toLowerCase() || ".jpg";
  if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return NextResponse.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "public", "uploads", "gallery");
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-]+/gi, "-").toLowerCase()}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  const photo = await addGalleryPhoto(`/uploads/gallery/${filename}`, String(form.get("alt") || ""));
  refreshGallery();
  return NextResponse.json({ photo });
}

export async function DELETE(request: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const src = String(body.src || "");
  if (!id) return NextResponse.json({ error: "Photo not found." }, { status: 400 });
  await deleteGalleryPhoto(id);
  if (src.startsWith("/uploads/gallery/")) {
    await unlink(path.join(process.cwd(), "public", src)).catch(() => undefined);
  }
  refreshGallery();
  return NextResponse.json({ ok: true });
}
