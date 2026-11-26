import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bustMenuCache } from "@/lib/platform/menu";
import { penceFromPrice, slugify } from "@/lib/platform/money";
import { getStaff, getStaffBranch } from "@/lib/platform/session";

async function staff() {
  const user = await getStaff();
  if (!user) throw new Error("Sign in required.");
  return user;
}

function uniqueSlug(base: string, extra = "") {
  const raw = slugify(`${base}${extra ? `-${extra}` : ""}`) || `item-${Date.now()}`;
  return raw;
}

export async function POST(request: Request) {
  try {
    await staff();
    const body = await request.json();
    const action = String(body.action || "save");
    const locationId = await getStaffBranch();

    if (action === "clear_photo") {
      const existing = await db.menuProduct.findUnique({ where: { id: String(body.id) } });
      if (!existing) return NextResponse.json({ error: "Item not found." }, { status: 404 });
      if (existing.photo.startsWith("/uploads/menu/")) {
        await unlink(path.join(process.cwd(), "public", existing.photo)).catch(() => undefined);
      }
      await db.menuProduct.update({ where: { id: existing.id }, data: { photo: "" } });
      bustMenuCache();
      revalidatePath("/");
      revalidatePath("/menu");
      revalidatePath("/manchester/menu");
      revalidatePath("/chorlton/menu");
      revalidatePath("/admin/menu");
      return NextResponse.json({ ok: true, photo: "" });
    }

    if (action === "delete") {
      await db.menuPrice.deleteMany({ where: { productId: String(body.id), locationId } });
      const leftover = await db.menuPrice.count({ where: { productId: String(body.id) } });
      if (!leftover) {
        const used = await db.orderItem.count({ where: { productId: String(body.id) } });
        if (used) {
          await db.menuProduct.update({ where: { id: String(body.id) }, data: { available: false } });
        } else {
          await db.menuProduct.delete({ where: { id: String(body.id) } });
        }
      }
      bustMenuCache();
      revalidatePath("/");
      revalidatePath("/menu");
      revalidatePath("/manchester/menu");
      revalidatePath("/chorlton/menu");
      return NextResponse.json({ ok: true });
    }

    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    const prices = Array.isArray(body.prices) ? body.prices : [];
    const branchAvailable = body.available !== false;
    const data = {
      name,
      description: String(body.description || "").trim(),
      category: String(body.category || "PIZZAS"),
      photo: String(body.photo || ""),
      dietary: String(body.dietary || ""),
      note: String(body.note || ""),
    };

    let product;
    if (body.id) {
      product = await db.menuProduct.update({ where: { id: String(body.id) }, data });
    } else {
      let slug = uniqueSlug(name);
      const clash = await db.menuProduct.findUnique({ where: { slug } });
      if (clash) slug = uniqueSlug(name, String(Date.now()).slice(-4));
      const count = await db.menuProduct.count();
      product = await db.menuProduct.create({ data: { ...data, slug, sortOrder: count } });
    }

    await db.menuPrice.deleteMany({ where: { productId: product.id, locationId } });
    for (const row of prices) {
      const pricePence = typeof row.pricePence === "number" ? row.pricePence : penceFromPrice(String(row.price || ""));
      if (!pricePence && row.price !== "0" && row.price !== "£0") continue;
      await db.menuPrice.create({
        data: {
          productId: product.id,
          locationId,
          label: String(row.label || "").trim(),
          pricePence,
          available: branchAvailable && row.available !== false,
        },
      });
    }

    const full = await db.menuProduct.findUnique({
      where: { id: product.id },
      include: { prices: { where: { locationId } } },
    });
    bustMenuCache();
    revalidatePath("/");
    revalidatePath("/menu");
    revalidatePath("/manchester/menu");
    revalidatePath("/chorlton/menu");
    revalidatePath("/manchester");
    revalidatePath("/chorlton");
    return NextResponse.json({ product: full });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save menu.";
    return NextResponse.json({ error: message }, { status: message === "Sign in required." ? 401 : 400 });
  }
}
