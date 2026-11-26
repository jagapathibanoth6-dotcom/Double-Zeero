import { NextResponse } from "next/server";
import { getPartyByCode, saveGuestList } from "@/lib/platform/party";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const party = await getPartyByCode(code);
  if (!party) return NextResponse.json({ error: "Party not found." }, { status: 404 });
  const body = await request.json().catch(() => null);
  const names = Array.isArray(body?.names) ? body.names.map(String) : [];
  const updated = await saveGuestList(party.id, names);
  return NextResponse.json({ ok: true, guests: updated?.guests.map((g) => ({ id: g.id, name: g.name })) });
}
