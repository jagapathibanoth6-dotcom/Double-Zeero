import type { Metadata } from "next";
import { LocationCard } from "@/components/LocationCard";
import { SectionTitle, SitePage } from "@/components/ui";

export const metadata: Metadata = {
  title: "Locations",
  description: "Double Zero in Manchester City Centre (Spring Gardens) and Chorlton (Barlow Moor Road).",
};

export default function LocationsPage() {
  return (
    <SitePage wide>
        <SectionTitle
          eyebrow="Find us"
          title="Two Manchester restaurants."
          copy="The original restaurant is on Barlow Moor Road in Chorlton. The City Centre kitchen opened on Spring Gardens in 2024, a short walk from Piccadilly Gardens, with a bar and seats for around 80."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <LocationCard id="manchester" />
          <LocationCard id="chorlton" />
        </div>
    </SitePage>
  );
}
