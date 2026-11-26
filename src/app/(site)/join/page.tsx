import type { Metadata } from "next";
import { EnquiryForm } from "@/components/EnquiryForm";
import { SectionTitle, SitePage } from "@/components/ui";

export const metadata: Metadata = {
  title: "Join the team",
  description: "Work at Double Zero in Manchester City Centre or Chorlton. Kitchen and floor applications welcome.",
};

export default function JoinPage() {
  return (
    <SitePage wide>
      <div className="grid gap-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <SectionTitle
            eyebrow="Careers"
            title="Join the team."
            copy="Double Zero is an independent kitchen that cares about the craft. If you want to work in the kitchen or on the floor, we would like to hear from you."
          />
          <p className="mt-6 text-sm leading-relaxed text-mute">
            Tell us which location you prefer, the role you want, and a little about your experience. We will reply if
            there is a fit.
          </p>
        </div>
        <div className="form-panel md:col-span-6 md:col-start-7">
          <EnquiryForm
            to="info@doublezeroltd.com"
            subjectPrefix="Double Zero application"
            fields={[
              { name: "name", label: "Name", required: true },
              { name: "email", label: "Email", type: "email", required: true },
              { name: "phone", label: "Phone", type: "tel", required: true },
              {
                name: "location",
                label: "Preferred location",
                required: true,
                options: ["Manchester City Centre", "Chorlton", "Either"],
              },
              {
                name: "role",
                label: "Role",
                required: true,
                options: ["Kitchen", "Front of house", "Bar", "Other"],
              },
              { name: "message", label: "About you", type: "textarea", required: true },
            ]}
          />
        </div>
      </div>
    </SitePage>
  );
}
