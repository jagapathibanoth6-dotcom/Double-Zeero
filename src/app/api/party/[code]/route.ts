import { NextResponse } from "next/server";
import { getPartyByCode, partyProgress, publicPartyView } from "@/lib/platform/party";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const party = await getPartyByCode(code);
  if (!party) return NextResponse.json({ error: "Party not found." }, { status: 404 });
  const progress = partyProgress(party);
  return NextResponse.json({
    party: publicPartyView(party),
    progress,
  });
}
