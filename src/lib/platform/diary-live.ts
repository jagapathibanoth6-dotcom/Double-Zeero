import type { LocationId } from "@/data/site";
import { diaryHours, spanHours } from "@/lib/platform/diary";
import { hoursFromSettings } from "@/lib/platform/hours";
import { getSettings } from "@/lib/platform/settings";

/**
 * Diary opening span using the restaurant's saved settings (server only).
 * diary.ts stays free of database code because client components import it.
 */
export async function diaryHoursLive(locationId: LocationId, isoDate: string) {
  const settings = await getSettings(locationId);
  const table = hoursFromSettings(locationId, settings, "table", isoDate);
  const collect = hoursFromSettings(locationId, settings, "collection", isoDate);
  return spanHours([table, collect, diaryHours(locationId, isoDate)]);
}
