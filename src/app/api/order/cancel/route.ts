import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/platform/rate-limit";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/platform/money";
import { customerCancelOrder } from "@/lib/platform/customer-cancel";

export async function POST(request: Request) {
  if (!rateLimit(`cancel:${clientIp(request)}`, 20, 15 * 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const ref = String(body?.ref || "").trim().toUpperCase();
  if (!ref) return NextResponse.json({ error: "Missing order reference." }, { status: 400 });
  const order = await db.order.findUnique({ where: { ref }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  try {
    const result = await customerCancelOrder(order.id);
    return NextResponse.json({
      ok: true,
      refundedPence: result.refunded,
      quote: result.quote,
      message: result.refunded
        ? `Order cancelled. ${formatMoney(result.refunded)} will be refunded to the same payment method.`
        : "Order cancelled. Nothing was paid, so there is no refund.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not cancel." }, { status: 400 });
  }
}
