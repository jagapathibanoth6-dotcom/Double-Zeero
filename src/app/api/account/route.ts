import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { LocationId } from "@/data/site";
import { publicCustomer } from "@/lib/platform/customer-access";
import { getAccountOverview } from "@/lib/platform/account";
import { hashPassword, verifyPassword } from "@/lib/platform/password";
import { clientIp, rateLimit } from "@/lib/platform/rate-limit";
import { formatMoney } from "@/lib/platform/money";
import { quoteDelivery } from "@/lib/platform/orders";
import { customerCancelBooking, customerCancelOrder } from "@/lib/platform/customer-cancel";
import { clearCustomerCookie, getCustomer, setCustomerCookie } from "@/lib/platform/session";

export async function GET() {
  const customer = await getCustomer();
  if (!customer) return NextResponse.json({ customer: null });
  return NextResponse.json(await getAccountOverview(customer));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.action === "logout") {
    await clearCustomerCookie();
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "change_password") {
    const customer = await getCustomer();
    if (!customer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const next = String(body.password || "");
    if (next.length < 6) return NextResponse.json({ error: "Use at least 6 characters." }, { status: 400 });
    await db.customer.update({
      where: { id: customer.id },
      data: { passwordHash: hashPassword(next), mustChangePassword: false },
    });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "update_booking") {
    const customer = await getCustomer();
    if (!customer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const booking = await db.booking.findFirst({
      where: { id: String(body.bookingId || ""), customerId: customer.id },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return NextResponse.json({ error: "That booking is already finished." }, { status: 400 });
    }
    const locationId = body.locationId === "chorlton" ? "chorlton" : "manchester";
    const visitType = body.visitType === "collection" ? "collection" : "table";
    const date = String(body.date || booking.date);
    const time = String(body.time || "").trim();
    const guests = Math.max(1, Number(body.guests) || booking.guests);
    const notes = String(body.notes || "").trim();
    const highchair = Boolean(body.highchair);
    if (!time) return NextResponse.json({ error: "Choose a time." }, { status: 400 });
    await db.booking.update({
      where: { id: booking.id },
      data: { locationId, visitType, date, time, guests, notes, highchair },
    });
    return NextResponse.json({ ok: true, message: "Booking updated." });
  }

  if (body?.action === "cancel_booking") {
    const customer = await getCustomer();
    if (!customer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const booking = await db.booking.findFirst({
      where: { id: String(body.bookingId), customerId: customer.id },
      select: { id: true },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    let result;
    try {
      result = await customerCancelBooking(booking.id);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not cancel." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      refundedPence: result.refunded,
      quote: result.quote,
      message: result.refunded
        ? `Booking cancelled. ${formatMoney(result.refunded)} will be refunded to the same payment method.`
        : "Booking cancelled. Nothing was paid, so there is no refund.",
    });
  }

  if (body?.action === "update_details") {
    const customer = await getCustomer();
    if (!customer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!name) return NextResponse.json({ error: "Add your name." }, { status: 400 });
    if (!email.includes("@")) return NextResponse.json({ error: "Add a valid email." }, { status: 400 });
    if (email !== customer.email) {
      const taken = await db.customer.findUnique({ where: { email } });
      if (taken) return NextResponse.json({ error: "That email is already in use." }, { status: 400 });
    }
    if (password && password.length < 6) {
      return NextResponse.json({ error: "Use at least 6 characters for the password." }, { status: 400 });
    }
    const updated = await db.customer.update({
      where: { id: customer.id },
      data: {
        name,
        phone,
        email,
        ...(password
          ? { passwordHash: hashPassword(password), mustChangePassword: false }
          : {}),
      },
    });
    return NextResponse.json({ customer: publicCustomer(updated) });
  }

  if (body?.action === "update_order") {
    const customer = await getCustomer();
    if (!customer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const order = await db.order.findFirst({
      where: { id: String(body.orderId || ""), customerId: customer.id },
      include: { delivery: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      return NextResponse.json({ error: "That order is already finished." }, { status: 400 });
    }
    const source = body.source === "DZ_DELIVERY" ? "DZ_DELIVERY" : "CLICK_COLLECT";
    const locationId = (body.locationId === "chorlton" ? "chorlton" : "manchester") as LocationId;
    const asap = Boolean(body.asap);
    const date = String(body.date || order.date || "");
    const time = asap ? "" : String(body.time || "").trim();
    const address = source === "DZ_DELIVERY" ? String(body.address || "").trim() : "";
    const notes = String(body.notes || "").trim();
    if (!asap && !time) {
      return NextResponse.json({ error: source === "DZ_DELIVERY" ? "Choose a delivery time or ASAP." : "Choose a collection time or ASAP." }, { status: 400 });
    }
    let deliveryFee = 0;
    if (source === "DZ_DELIVERY") {
      if (!address) return NextResponse.json({ error: "Add a home address." }, { status: 400 });
      const quote = await quoteDelivery(locationId, address);
      if (!quote.ok) return NextResponse.json({ error: quote.reason }, { status: 400 });
      deliveryFee = quote.feePence;
      if (order.delivery) {
        await db.delivery.update({
          where: { id: order.delivery.id },
          data: { quotePence: deliveryFee, etaMinutes: quote.etaMinutes, status: "QUOTED" },
        });
      } else {
        await db.delivery.create({
          data: { orderId: order.id, quotePence: deliveryFee, etaMinutes: quote.etaMinutes, status: "QUOTED" },
        });
      }
    } else if (order.delivery) {
      await db.delivery.delete({ where: { id: order.delivery.id } });
    }
    await db.order.update({
      where: { id: order.id },
      data: {
        source,
        locationId,
        date,
        time,
        asap,
        address,
        notes,
        deliveryFeePence: deliveryFee,
        totalPence: order.subtotalPence - order.discountPence + deliveryFee,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "cancel_order") {
    const customer = await getCustomer();
    if (!customer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const order = await db.order.findFirst({
      where: { id: String(body.orderId || ""), customerId: customer.id },
      select: { id: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    let result;
    try {
      result = await customerCancelOrder(order.id);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not cancel." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      refundedPence: result.refunded,
      quote: result.quote,
      message: result.refunded
        ? `Order cancelled. ${formatMoney(result.refunded)} will be refunded to the same payment method.`
        : "Order cancelled. Nothing was paid, so there is no refund.",
    });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!email.includes("@") || !password) {
    return NextResponse.json({ error: "Enter the email and temporary password from your confirmation." }, { status: 400 });
  }
  if (!rateLimit(`customer-login:${clientIp(request)}`, 10, 15 * 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  const customer = await db.customer.findUnique({ where: { email } });
  const check = verifyPassword(password, customer?.passwordHash);
  if (!customer || !check.ok) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  if (check.needsRehash) {
    await db.customer.update({ where: { id: customer.id }, data: { passwordHash: hashPassword(password) } });
  }
  await setCustomerCookie(customer.id);
  return NextResponse.json({ customer: publicCustomer(customer) });
}
