export async function startStripeCheckout(input: {
  locationId: string;
  orderId?: string;
  orderIds?: string[];
  bookingId?: string;
  partyCode?: string;
  cancelPath: string;
}) {
  const res = await fetch("/api/pay/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error(data.error || "Could not start payment.");
  window.location.href = data.url;
}
