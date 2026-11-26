import { redirect } from "next/navigation";
import { markStripePaidBySession } from "@/lib/platform/stripe";

export const dynamic = "force-dynamic";

export default async function PayReturn({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) redirect("/");
  let result: Awaited<ReturnType<typeof markStripePaidBySession>>;
  try {
    result = await markStripePaidBySession(sessionId);
  } catch {
    redirect("/?pay=failed");
  }
  if (result.partyCode) redirect(`/party/${result.partyCode}`);
  if (result.bookingRef) redirect(`/book/confirmed?ref=${result.bookingRef}`);
  if (result.orderRef) redirect(`/order/confirmed?ref=${result.orderRef}`);
  redirect("/");
}
