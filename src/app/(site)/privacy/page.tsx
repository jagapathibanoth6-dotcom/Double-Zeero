import type { Metadata } from "next";
import { SectionTitle, SitePage } from "@/components/ui";
import { brand } from "@/data/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy information for the Double Zero website.",
};

export default function PrivacyPage() {
  return (
    <SitePage>
        <SectionTitle
          eyebrow="Legal"
          title="Privacy"
          copy={`${brand.legalName} uses this website to share menus, opening times and contact details for our Manchester restaurants.`}
        />
        <div className="site-card mt-10 space-y-5 p-8 text-sm leading-relaxed text-mute md:p-10">
          <p>
            If you send an enquiry or job application, we use the details you provide only to respond. We do not sell
            personal data.
          </p>
          <p>
            Booking platforms such as Dish Cult have their own privacy notices. Please read those when you reserve a
            table online.
          </p>
          <p>
            Questions:{" "}
            <a className="ember-link text-ink" href="mailto:info@doublezeroltd.com">
              info@doublezeroltd.com
            </a>
            .
          </p>
        </div>
    </SitePage>
  );
}
