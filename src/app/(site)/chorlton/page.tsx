import type { Metadata } from "next";
import { LocationSite } from "@/components/LocationSite";

export const metadata: Metadata = {
  title: "Chorlton",
  description:
    "Double Zero Chorlton at 368 Barlow Moor Road — menu, table and collection bookings, BYOB and contact for this restaurant only.",
};

export default function ChorltonPage() {
  return (
    <LocationSite
      locationId="chorlton"
      kicker="368 Barlow Moor Road"
      title="Double Zero Chorlton."
      copy="The original Double Zero, opened in 2015. Menu, evening hours, BYOB and collection on this page are for 368 Barlow Moor Road only."
      extras={[
        "Bring your own alcohol — £2.50 per person. No soft drinks or mixers permitted.",
        "A Co-op and Carrington’s Wine Merchants sit a few doors away.",
      ]}
      heroSrc="/images/food-2.jpg"
      heroAlt="Pizza at Double Zero Chorlton"
    />
  );
}
