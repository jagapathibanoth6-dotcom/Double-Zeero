import type { LocationId } from "@/data/site";
import { todayISO } from "@/lib/booking";
import { liveProducts } from "@/lib/platform/menu";
import { kitchenAsap, kitchenHours, openKitchenDates, timeWithinKitchen } from "@/lib/platform/hours";
import { searchSlots } from "@/lib/platform/booking";
import { getSettings } from "@/lib/platform/settings";

export async function orderDeskSeed(locationId: LocationId, kind: "collect" | "delivery") {
  const settings = await getSettings(locationId);
  const date = todayISO();
  const hours = kitchenHours(locationId, settings, date);
  const asap = kitchenAsap(locationId, settings, kind, date);
  const dates = openKitchenDates(locationId, settings, kind);
  const search = await searchSlots({ locationId, date, guests: 1, visitType: "collection" });
  const products = await liveProducts(locationId);
  return {
    locationId,
    date,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      photo: product.photo || "",
      available: product.prices.some((price) => price.available),
      prices: product.prices.map((price) => ({
        id: price.id,
        pricePence: price.pricePence,
        label: price.label,
        available: price.available,
      })),
    })),
    dates: dates.map((row) => ({ date: row.date, label: row.label })),
    slots: search.slots
      .filter((slot) => timeWithinKitchen(hours, slot.time, kind))
      .map((slot) => ({ time: slot.time, available: slot.available, used: slot.used, cap: slot.cap })),
    when: {
      openLabel: hours ? `Open ${hours.open}–${hours.close}` : "Closed today",
      hours,
      asap,
    },
  };
}
