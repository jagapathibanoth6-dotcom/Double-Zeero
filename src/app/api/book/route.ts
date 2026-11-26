import { NextResponse } from "next/server";
import { locations, type LocationId, type VisitType } from "@/data/site";
import { todayISO } from "@/lib/booking";
import { db } from "@/lib/db";
import { createBooking } from "@/lib/platform/booking";
import { formatMoney } from "@/lib/platform/money";
import { setCustomerCookie, setPreferredLocation } from "@/lib/platform/session";
import { createResdiaryBooking, getResdiaryBooking, resdiaryConfigured } from "@/lib/resdiary";

function isLocation(value: string): value is LocationId {
  return value === "manchester" || value === "chorlton";
}

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref")?.toUpperCase();
  if (!ref) return NextResponse.json({ error: "Missing booking reference." }, { status: 400 });

  const local = await db.booking.findUnique({
    where: { ref },
    include: { party: true, payments: { include: { refunds: true } } },
  });
  if (local) {
    return NextResponse.json({
      booking: local,
      party: local.party,
    });
  }

  if (resdiaryConfigured()) {
    for (const locationId of ["manchester", "chorlton"] as LocationId[]) {
      try {
        const row = await getResdiaryBooking(locationId, ref);
        if (row?.Reference) {
          return NextResponse.json({
            booking: {
              ref: row.Reference,
              locationId,
              visitType: row.IsTakeawayBooking || row.TakeawayType === "Collection" ? "collection" : "table",
              date: String(row.VisitDate || "").slice(0, 10),
              time: String(row.VisitTime || "").slice(0, 5),
              guests: row.PartySize || 0,
              name: [row.Customer?.FirstName, row.Customer?.Surname].filter(Boolean).join(" "),
              email: row.Customer?.Email || "",
              phone: row.Customer?.Mobile || row.Customer?.Phone || "",
              notes: row.SpecialRequests || "",
              status: "CONFIRMED",
            },
          });
        }
      } catch {
        /* try the other venue */
      }
    }
  }

  return NextResponse.json({ error: "Booking not found." }, { status: 404 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const locationId = String(body.locationId || "");
  if (!isLocation(locationId)) return NextResponse.json({ error: "Choose a restaurant." }, { status: 400 });

  const visitType = String(body.visitType || "table") as VisitType;
  if (!locations[locationId].visitTypes.includes(visitType)) {
    return NextResponse.json({ error: "That visit type is not available here." }, { status: 400 });
  }

  const date = String(body.date || "");
  const time = String(body.time || "");
  const guests = Number(body.guests);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayISO()) {
    return NextResponse.json({ error: "Choose a valid date." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(time)) return NextResponse.json({ error: "Choose a time." }, { status: 400 });
  if (!Number.isInteger(guests) || guests < 1 || guests > 40) {
    return NextResponse.json({ error: "Choose a party size." }, { status: 400 });
  }
  if (name.length < 2 || !email.includes("@") || phone.length < 7) {
    return NextResponse.json({ error: "Please add your name, email and phone number." }, { status: 400 });
  }

  try {
    const result = await createBooking({
      locationId,
      visitType,
      date,
      time,
      guests,
      name,
      email,
      phone,
      notes: String(body.notes || ""),
      highchair: Boolean(body.highchair),
      source: String(body.source || "website"),
      payDeposit: Boolean(body.payDeposit),
      paymentMode: String(body.paymentMode || "INDIVIDUAL"),
    });

    await setCustomerCookie(result.customer.id);
    await setPreferredLocation(locationId);

    if (resdiaryConfigured() && result.band === "NORMAL") {
      try {
        await createResdiaryBooking({
          locationId,
          visitType,
          date,
          time,
          guests,
          name,
          email,
          phone,
          notes: String(body.notes || ""),
          highchair: Boolean(body.highchair),
        });
      } catch {
        /* keep Double Zero booking if ResDiary is unavailable */
      }
    }

    return NextResponse.json({
      booking: result.booking,
      party: result.party,
      band: result.band,
      depositRequired: result.depositRequired,
      depositAmount: formatMoney(result.depositAmountPence),
      depositAmountPence: result.depositAmountPence,
      preorderRequired: result.preorderRequired,
      reminderText: result.reminderText,
      access: result.access,
      mail: result.mail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete the booking.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
