/** Branch settings, tables, table combinations and QR codes. */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guestsOnTables } from "@/lib/platform/booking";
import { createQrCode, deleteQrCode, findQrById } from "@/lib/platform/qr";
import { assertStaffBranch } from "@/lib/platform/admin";
import { ensureSettingColumns } from "@/lib/platform/settings";
import { getStaffBranch } from "@/lib/platform/session";
import type { ActionHandlers } from "./types";

export const settingsActions: ActionHandlers = {
  save_settings: async ({ body }) => {
    await ensureSettingColumns();
    const locationId = await getStaffBranch();
    const sittingCapacity = Math.max(1, Number(body.sittingCapacity || 40));
    const collectionRemindMinutes = Math.max(1, Number(body.collectionRemindMinutes || 15));
    const settings = await db.locationSettings.update({
      where: { locationId },
      data: {
        maxOnlineGuests: Number(body.maxOnlineGuests),
        largeFrom: Number(body.largeFrom),
        maxAutoBooking: Number(body.maxAutoBooking),
        enquiryFrom: Number(body.enquiryFrom),
        depositEnabled: Boolean(body.depositEnabled),
        depositType: String(body.depositType),
        depositAmountPence: Number(body.depositAmountPence),
        depositFrom: Number(body.depositFrom),
        preorderEnabled: Boolean(body.preorderEnabled),
        preorderFrom: Number(body.preorderFrom),
        preorderDeadlineHours: Number(body.preorderDeadlineHours),
        waitlistEnabled: Boolean(body.waitlistEnabled),
        collectionMaxPerSlot: Number(body.collectionMaxPerSlot),
        turnaroundMinutes: Number(body.turnaroundMinutes || 15),
        durationJson: String(body.durationJson || ""),
        hoursJson: String(body.hoursJson || ""),
        collectionHoursJson: String(body.collectionHoursJson || ""),
      },
    });
    const stripeSecretKey = String(body.stripeSecretKey || "").trim();
    const stripePublishableKey = String(body.stripePublishableKey || "").trim();
    const sets = ["sittingCapacity = ?", "collectionRemindMinutes = ?"];
    const vals: Array<string | number> = [sittingCapacity, collectionRemindMinutes];
    if (stripeSecretKey) {
      sets.push("stripeSecretKey = ?");
      vals.push(stripeSecretKey);
    }
    if (stripePublishableKey) {
      sets.push("stripePublishableKey = ?");
      vals.push(stripePublishableKey);
    }
    vals.push(locationId);
    await db.$executeRawUnsafe(`UPDATE LocationSettings SET ${sets.join(", ")} WHERE locationId = ?`, ...vals);
    return NextResponse.json({
      settings: { ...settings, sittingCapacity, collectionRemindMinutes },
    });
  },

  save_table: async ({ body }) => {
    const locationId = await getStaffBranch();
    const data = {
      locationId,
      code: String(body.code || "").trim().toUpperCase(),
      seats: Number(body.seats || 2),
      x: Number(body.x || 1),
      y: Number(body.y || 1),
      active: body.active !== false,
    };
    if (!data.code) throw new Error("Table code is required.");
    if (body.id && data.active === false) {
      const existing = await db.table.findUnique({ where: { id: String(body.id) } });
      if (existing) {
        const seated = await guestsOnTables(existing.locationId, [existing.code]);
        if (seated.length) {
          const who = seated[0];
          throw new Error(`Cannot turn off ${existing.code}. ${who.name} is on it (${who.guests} pax, ${who.date} ${who.time}).`);
        }
      }
    }
    const table = body.id
      ? await db.table.update({ where: { id: String(body.id) }, data })
      : await db.table.create({ data });
    return NextResponse.json({ table });
  },

  delete_table: async ({ body }) => {
    const table = await db.table.findUnique({ where: { id: String(body.id) } });
    if (!table) throw new Error("Table not found.");
    await assertStaffBranch(table.locationId);
    const seated = await guestsOnTables(table.locationId, [table.code]);
    if (seated.length) {
      const who = seated[0];
      throw new Error(`Cannot delete ${table.code}. ${who.name} is on it (${who.guests} pax, ${who.date} ${who.time}).`);
    }
    await db.table.delete({ where: { id: table.id } });
    return NextResponse.json({ ok: true });
  },

  save_combo: async ({ body }) => {
    const locationId = await getStaffBranch();
    const combo = body.id
      ? await db.tableCombo.update({
          where: { id: String(body.id) },
          data: { codes: String(body.codes || ""), seats: Number(body.seats || 0) },
        })
      : await db.tableCombo.create({
          data: { locationId, codes: String(body.codes || ""), seats: Number(body.seats || 0) },
        });
    return NextResponse.json({ combo });
  },

  delete_combo: async ({ body }) => {
    const combo = await db.tableCombo.findUnique({ where: { id: String(body.id) } });
    if (!combo) throw new Error("Combo not found.");
    const seated = await guestsOnTables(combo.locationId, combo.codes.split(","));
    if (seated.length) {
      throw new Error(`Cannot delete combo ${combo.codes}. Guests are on those tables.`);
    }
    await db.tableCombo.delete({ where: { id: combo.id } });
    return NextResponse.json({ ok: true });
  },

  save_qr: async ({ body }) => {
    const locationId = await getStaffBranch();
    const name = String(body.name || "").trim();
    if (!name) throw new Error("Give this QR a name.");
    const qr = await createQrCode(locationId, name);
    revalidatePath("/admin/settings");
    return NextResponse.json({ qr });
  },

  delete_qr: async ({ body }) => {
    const qr = await findQrById(String(body.id));
    if (!qr) throw new Error("QR code not found.");
    await assertStaffBranch(qr.locationId);
    await deleteQrCode(qr.id);
    revalidatePath("/admin/settings");
    return NextResponse.json({ ok: true });
  },
};
