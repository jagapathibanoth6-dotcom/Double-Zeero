/** Display helpers for the customer account page. */
import { locations, type LocationId } from "@/data/site";

export function placeName(id?: string) {
  return locations[id as LocationId]?.shortName || id || "Double Zero";
}

export function statusText(value?: string) {
  return String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function orderIsDone(status?: string) {
  return status === "COMPLETED" || status === "CANCELLED";
}

export function orderNeed(order: { source?: string; status?: string }) {
  const collect = order.source === "CLICK_COLLECT";
  const delivery = order.source === "DZ_DELIVERY";
  switch (order.status) {
    case "NEW":
      return "Sent to the kitchen";
    case "ACCEPTED":
      return "Accepted — waiting to start";
    case "PREPARING":
      return "Being made now";
    case "READY":
      return collect ? "Ready to collect" : delivery ? "Ready for the courier" : "Ready";
    case "DISPATCHED":
      return "On the way";
    case "COMPLETED":
      return collect ? "Collected" : delivery ? "Delivered" : "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return statusText(order.status);
  }
}
