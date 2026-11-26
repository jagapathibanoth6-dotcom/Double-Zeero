import { NextResponse } from "next/server";
import { getPartyByCode, partyProgress } from "@/lib/platform/party";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const party = await getPartyByCode(code);
  if (!party) return NextResponse.json({ error: "Party not found." }, { status: 404 });
  const progress = partyProgress(party);
  return NextResponse.json({
    party: {
      code: party.code,
      paymentMode: party.paymentMode,
      deadlineAt: party.deadlineAt,
      booking: {
        ref: party.booking.ref,
        locationId: party.booking.locationId,
        date: party.booking.date,
        time: party.booking.time,
        guests: party.booking.guests,
        name: party.booking.name,
        status: party.booking.status,
      },
      guests: party.guests.map((g) => ({
        id: g.id,
        name: g.name,
        ordered: g.orders.length > 0,
        totalPence: g.orders[0]?.totalPence || 0,
        paid: g.orders[0]?.payments.some((p) => p.status === "PAID") || false,
        items: g.orders[0]?.items || [],
      })),
    },
    progress,
  });
}
