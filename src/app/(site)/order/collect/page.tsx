import type { Metadata } from "next";
import { OrderDesk } from "@/components/OrderDesk";
import { SitePage } from "@/components/ui";
import { orderDeskSeed } from "@/lib/platform/order-desk-data";
import { cleanVia } from "@/lib/platform/via";

export const metadata: Metadata = { title: "Click & collect" };

export default async function CollectPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; via?: string }>;
}) {
  const params = await searchParams;
  const locationId = params.location === "chorlton" ? "chorlton" : "manchester";
  const seed = { ...(await orderDeskSeed(locationId, "collect")), via: cleanVia(params.via) || "Website" };
  return (
    <SitePage wide>
        <h1 className="serif text-4xl leading-tight md:text-5xl">Click & collect</h1>
        <p className="mt-3 max-w-2xl text-base text-mute">
          Select a restaurant, a collection time, and your order. Collect from the counter when it is ready.
        </p>
        <div className="mt-10">
          <OrderDesk seed={seed} />
        </div>
    </SitePage>
  );
}
