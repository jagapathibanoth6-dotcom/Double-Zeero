import { NextResponse } from "next/server";
import { getStaff } from "@/lib/platform/session";
import { bookingsActions } from "./handlers/bookings";
import { customersActions } from "./handlers/customers";
import { menuActions } from "./handlers/menu";
import { ordersActions } from "./handlers/orders";
import { partiesActions } from "./handlers/parties";
import { paymentsActions } from "./handlers/payments";
import { settingsActions } from "./handlers/settings";
import type { ActionHandlers } from "./handlers/types";

/**
 * Single endpoint for admin dashboard actions.
 *
 * The dashboard POSTs `{ action: "order_status", ...fields }` and the matching
 * handler in ./handlers runs. Each handler checks that the record belongs to the
 * branch the staff member is working in.
 */
const handlers: ActionHandlers = {
  ...ordersActions,
  ...paymentsActions,
  ...bookingsActions,
  ...partiesActions,
  ...menuActions,
  ...settingsActions,
  ...customersActions,
};

export async function POST(request: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const body = await request.json();
    const handler = handlers[String(body?.action || "")];
    if (!handler) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    return await handler({ staff, body });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
