import type { Metadata } from "next";
import { MenuList } from "@/components/MenuList";
import { Button, SectionTitle, SitePage } from "@/components/ui";
import { locations } from "@/data/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "City Centre menu",
  description: "The Double Zero Manchester City Centre menu at 55 Spring Gardens.",
};

export default function ManchesterMenuPage() {
  const loc = locations.manchester;
  return (
    <SitePage wide>
        <SectionTitle eyebrow="55 Spring Gardens, M2 2BY" title="City Centre menu." copy={loc.notes[0]} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href={loc.bookingPath}>Book City Centre</Button>
          <Button href="/manchester" variant="ghost">
            Back to City Centre
          </Button>
        </div>
        <div className="mt-14">
          <MenuList locationId="manchester" />
        </div>
    </SitePage>
  );
}
