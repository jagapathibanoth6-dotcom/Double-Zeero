import { locations, type LocationId } from "@/data/site";

export function resdiaryBookUrl(locationId: LocationId) {
  const fromEnv =
    locationId === "manchester"
      ? process.env.NEXT_PUBLIC_RESDIARY_WIDGET_MANCHESTER
      : process.env.NEXT_PUBLIC_RESDIARY_WIDGET_CHORLTON;
  if (fromEnv?.trim()) return fromEnv.trim();
  const loc = locations[locationId];
  if (loc.dishCultUrl) return loc.dishCultUrl;
  return `https://booking.resdiary.com/widget/Standard/${loc.resdiaryMicrosite}`;
}

export function isResdiaryEmbed(url: string) {
  return /resdiary\.com\/widget/i.test(url) || /booking\.resdiary\.com/i.test(url);
}
