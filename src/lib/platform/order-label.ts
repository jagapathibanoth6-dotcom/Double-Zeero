export function orderTypeLabel(source?: string) {
  if (source === "CLICK_COLLECT") return "Click & collect";
  if (source === "DZ_DELIVERY") return "Home delivery";
  if (source === "POS") return "In restaurant";
  if (source === "PARTY" || source === "PARTY_PREORDER") return "Party food";
  return (source || "Order").replace(/_/g, " ");
}

export function orderKindClass(source?: string) {
  if (source === "CLICK_COLLECT") return "is-collect";
  if (source === "DZ_DELIVERY") return "is-delivery";
  if (source === "POS") return "is-inside";
  if (source === "PARTY" || source === "PARTY_PREORDER") return "is-party";
  return "is-other";
}

export function formatOrderWhen(order: { asap?: boolean; date?: string | null; time?: string | null }, prettyDate?: string) {
  if (order.asap) return prettyDate ? `ASAP · ${prettyDate}` : "ASAP";
  return [prettyDate || order.date, order.time].filter(Boolean).join(" · ") || "No time";
}

export function nextOrderStatus(source: string, status: string) {
  if (status === "NEW") return { status: "ACCEPTED", label: "Accept" };
  if (status === "ACCEPTED") return { status: "PREPARING", label: "Kitchen" };
  if (status === "PREPARING") return { status: "READY", label: "Ready" };
  if (status === "READY" && source === "DZ_DELIVERY") return { status: "DISPATCHED", label: "On the way" };
  if (status === "READY" && source === "CLICK_COLLECT") return { status: "COMPLETED", label: "Picked up" };
  if (status === "DISPATCHED") return { status: "COMPLETED", label: "Delivered" };
  if (status === "READY") return { status: "COMPLETED", label: "Done" };
  return null;
}

export type TrackLane = {
  id: string;
  label: string;
  note: string;
  statuses: string[];
};

export function trackLanes(kind: "CLICK_COLLECT" | "DZ_DELIVERY"): TrackLane[] {
  if (kind === "DZ_DELIVERY") {
    return [
      { id: "orders", label: "Orders", note: "New and accepted", statuses: ["NEW", "ACCEPTED"] },
      { id: "cooking", label: "Cooking", note: "In the kitchen", statuses: ["PREPARING"] },
      { id: "ready", label: "Ready", note: "Packed, waiting for the courier", statuses: ["READY"] },
      { id: "way", label: "On the way", note: "Out for home delivery", statuses: ["DISPATCHED"] },
      { id: "done", label: "Delivered", note: "Dropped at the door", statuses: ["COMPLETED"] },
    ];
  }
  return [
    { id: "orders", label: "Orders", note: "New and accepted", statuses: ["NEW", "ACCEPTED"] },
    { id: "cooking", label: "Cooking", note: "In the kitchen", statuses: ["PREPARING"] },
    { id: "ready", label: "Still to collect", note: "Ready at the counter", statuses: ["READY"] },
    { id: "done", label: "Picked up", note: "Already collected", statuses: ["COMPLETED"] },
  ];
}

export function orderIsOpen(status?: string) {
  return status !== "COMPLETED" && status !== "CANCELLED";
}

/** Readable status, e.g. "PENDING_DEPOSIT" → "Pending deposit". */
export function statusText(status?: string | null) {
  const text = String(status || "").replace(/_/g, " ").toLowerCase().trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

/** Colour family for a booking or order status badge in the dashboard. */
export function statusTone(status?: string | null) {
  const value = String(status || "").toUpperCase();
  if (["CANCELLED", "DECLINED"].includes(value)) return "is-bad";
  if (["COMPLETED", "CONFIRMED", "READY", "SEATED", "CONVERTED", "BOOKED"].includes(value)) return "is-good";
  if (value.startsWith("PENDING") || ["PREPARING", "WAITING", "OFFERED"].includes(value)) return "is-warn";
  if (["NEW", "ACCEPTED", "DISPATCHED"].includes(value)) return "is-info";
  return "";
}
