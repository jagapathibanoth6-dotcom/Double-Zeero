/** Switching menu products and sizes on/off per branch. */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertStaffBranch } from "@/lib/platform/admin";
import { bustMenuCache } from "@/lib/platform/menu";
import { getStaffBranch } from "@/lib/platform/session";
import type { ActionHandlers } from "./types";

export const menuActions: ActionHandlers = {
  product_available: async ({ body }) => {
    const available = Boolean(body.available);
    const locationId = await getStaffBranch();
    const productId = String(body.productId);
    const updated = await db.menuPrice.updateMany({
      where: { productId, locationId },
      data: { available },
    });
    if (!updated.count) {
      const source = await db.menuPrice.findFirst({ where: { productId } });
      await db.menuPrice.create({
        data: {
          productId,
          locationId,
          pricePence: source?.pricePence || 0,
          label: source?.label || "",
          available,
        },
      });
    }
    bustMenuCache();
    revalidatePath("/");
    revalidatePath("/menu");
    revalidatePath("/manchester/menu");
    revalidatePath("/chorlton/menu");
    revalidatePath("/manchester");
    revalidatePath("/chorlton");
    revalidatePath("/order/collect");
    revalidatePath("/admin/menu");
    revalidatePath("/api/menu");
    return NextResponse.json({ ok: true, locationId, available });
  },

  price_available: async ({ body }) => {
    const existing = await db.menuPrice.findUnique({ where: { id: String(body.priceId) } });
    if (!existing) throw new Error("Price not found.");
    await assertStaffBranch(existing.locationId);
    const price = await db.menuPrice.update({
      where: { id: existing.id },
      data: { available: Boolean(body.available) },
    });
    bustMenuCache();
    return NextResponse.json({ price });
  },
};
