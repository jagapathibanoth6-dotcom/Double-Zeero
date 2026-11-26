import { db } from "@/lib/db";
import { locations, type LocationId } from "@/data/site";
import { getSettings } from "@/lib/platform/settings";

export function uberReady(settings: { uberApiKey?: string | null; uberCustomerId?: string | null }) {
  return Boolean(String(settings.uberApiKey || "").trim() && String(settings.uberCustomerId || "").trim());
}

function pickupFor(locationId: string) {
  const loc = locations[locationId as LocationId];
  if (!loc) throw new Error("Restaurant not found.");
  return {
    name: `Double Zero ${loc.shortName}`,
    address: `${loc.address}, ${loc.city}, ${loc.postcode}`,
    phone: loc.phone,
    email: loc.email,
  };
}

async function uberCreate(input: {
  key: string;
  customerId: string;
  pickup: ReturnType<typeof pickupFor>;
  dropoff: { name: string; address: string; phone: string };
  ref: string;
  items: { name: string; quantity: number }[];
}) {
  const res = await fetch(`https://api.uber.com/v1/customers/${encodeURIComponent(input.customerId)}/deliveries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pickup_name: input.pickup.name,
      pickup_address: input.pickup.address,
      pickup_phone_number: input.pickup.phone,
      dropoff_name: input.dropoff.name,
      dropoff_address: input.dropoff.address,
      dropoff_phone_number: input.dropoff.phone || input.pickup.phone,
      manifest_items: input.items.map((item) => ({ name: item.name, quantity: item.quantity })),
      external_id: input.ref,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    tracking_url?: string;
    order_tracking_url?: string;
    fee?: number;
    dropoff_eta?: number;
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.message || data.error || "Uber did not accept this delivery.");
  }
  return {
    id: data.id || "",
    trackingUrl: data.tracking_url || data.order_tracking_url || "",
    etaMinutes: data.dropoff_eta ? Math.max(5, Math.round(Number(data.dropoff_eta) / 60)) : 40,
  };
}

export async function handToUber(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, delivery: true },
  });
  if (!order) throw new Error("Order not found.");
  if (order.source !== "DZ_DELIVERY") throw new Error("Only home delivery can go to Uber.");
  if (!order.address) throw new Error("This order has no drop-off address.");

  const settings = await getSettings(order.locationId as LocationId);
  const pickup = pickupFor(order.locationId);
  const key = String(settings.uberApiKey || "").trim();
  const customerId = String(settings.uberCustomerId || "").trim();
  const existing = order.delivery;

  if (existing?.trackingUrl && existing.status !== "QUOTED") {
    return existing;
  }

  let trackingUrl = existing?.trackingUrl || "";
  let etaMinutes = existing?.etaMinutes || 40;
  let courierName = "Uber Direct";

  if (key && customerId) {
    const created = await uberCreate({
      key,
      customerId,
      pickup,
      dropoff: { name: order.name || "Guest", address: order.address, phone: order.phone },
      ref: order.ref,
      items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
    });
    trackingUrl = created.trackingUrl || trackingUrl;
    etaMinutes = created.etaMinutes;
  } else {
    trackingUrl = trackingUrl || `/order/confirmed?ref=${order.ref}`;
    courierName = key ? "Uber Direct (needs Customer ID)" : "Uber Direct (demo)";
  }

  const data = {
    status: "COURIER_ASSIGNED",
    courierName,
    trackingUrl,
    etaMinutes,
    quotePence: existing?.quotePence || order.deliveryFeePence,
  };

  return existing
    ? db.delivery.update({ where: { id: existing.id }, data })
    : db.delivery.create({ data: { orderId: order.id, ...data } });
}
