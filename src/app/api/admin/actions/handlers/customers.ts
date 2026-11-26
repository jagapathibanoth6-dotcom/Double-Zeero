/** Editing customer records. */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ActionHandlers } from "./types";

export const customersActions: ActionHandlers = {
  update_customer: async ({ body }) => {
    const customer = await db.customer.update({
      where: { id: String(body.id) },
      data: {
        name: String(body.name || "").trim(),
        email: String(body.email || "").trim().toLowerCase(),
        phone: String(body.phone || "").trim(),
      },
    });
    return NextResponse.json({ customer });
  },
};
