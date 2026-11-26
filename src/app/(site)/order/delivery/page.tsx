import type { Metadata } from "next";
import { OrderDesk } from "@/components/OrderDesk";
import { SitePage } from "@/components/ui";
import { orderDeskSeed } from "@/lib/platform/order-desk-data";
import { cleanVia } from "@/lib/platform/via";

export const metadata: Metadata = { title: "Home delivery" };

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; via?: string }>;
}) {
  const params = await searchParams;
  const locationId = params.location === "chorlton" ? "chorlton" : "manchester";
  const seed = { ...(await orderDeskSeed(locationId, "delivery")), via: cleanVia(params.via) || "Website" };
  return (
    <SitePage wide>
        <h1 className="serif text-4xl leading-tight md:text-5xl">Home delivery</h1>
        <p className="mt-3 max-w-2xl text-base text-mute">
          Order from City Centre or Chorlton. We cook it here and deliver to your address.
        </p>
        <div className="mt-10">
          <OrderDesk mode="DZ_DELIVERY" seed={seed} />
        </div>
    </SitePage>
  );
}
