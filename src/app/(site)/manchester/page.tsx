import type { Metadata } from "next";
import { LocationSite } from "@/components/LocationSite";

export const metadata: Metadata = {
  title: "Manchester City Centre",
  description:
    "Double Zero Manchester at 55 Spring Gardens — menu, bookings, hours, bar and contact for the city centre restaurant only.",
};

export default function ManchesterPage() {
  return (
    <LocationSite
      locationId="manchester"
      kicker="55 Spring Gardens"
      title="Double Zero City Centre."
      copy="A contemporary restaurant with a Stefano Ferrara oven at the heart of the kitchen, a full bar, and pizza from midday. Menu, bookings and contact on this page are for 55 Spring Gardens only."
      extras={[
        "Cocktails include espresso martini, negroni and limoncello mojito, plus Italian and European wines.",
        "For groups larger than eight, call 0161 914 6212 or email mcr@pizzeriadoublezero.com.",
      ]}
      heroSrc="/images/interior.jpg"
      heroAlt="Sharing pizza at Double Zero Manchester"
    />
  );
}
