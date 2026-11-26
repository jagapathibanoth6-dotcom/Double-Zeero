import { NextResponse } from "next/server";
import type { LocationId } from "@/data/site";
import { liveProducts } from "@/lib/platform/menu";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locationId = (new URL(request.url).searchParams.get("locationId") || "manchester") as LocationId;
  const products = await liveProducts(locationId === "chorlton" ? "chorlton" : "manchester");
  return NextResponse.json(
    {
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
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
