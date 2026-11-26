import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/platform/money";
import { customerCancelBooking } from "@/lib/platform/customer-cancel";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ref = String(body?.ref || "").trim().toUpperCase();
  if (!ref) return NextResponse.json({ error: "Missing booking reference." }, { status: 400 });
  const booking = await db.booking.findUnique({ where: { ref }, select: { id: true } });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  try {
    const result = await customerCancelBooking(booking.id);
    return NextResponse.json({
      ok: true,
      refundedPence: result.refunded,
      quote: result.quote,
      message: result.refunded
        ? `Booking cancelled. ${formatMoney(result.refunded)} will be refunded to the same payment method.`
        : "Booking cancelled. Nothing was paid, so there is no refund.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not cancel." }, { status: 400 });
  }
}
