import type { Metadata } from "next";
import { SectionTitle, SitePage } from "@/components/ui";

export const metadata: Metadata = {
  title: "Order online",
  description: "Click & collect or home delivery from Chorlton and Manchester City Centre.",
};

export default function OrderPage() {
  return (
    <SitePage>
        <SectionTitle
          eyebrow="Order online"
          title="Click & collect or home delivery."
          copy="Pay online. Collect from the restaurant, or have it delivered to your address."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <a href="/order/collect" className="site-card block p-8 md:p-10">
            <p className="display text-[0.7rem] tracking-[0.2em] text-ember">Click & collect</p>
            <h2 className="serif mt-3 text-3xl">Collect from the restaurant.</h2>
            <p className="mt-3 text-sm text-mute">Choose a location and a collection time that suits the kitchen.</p>
            <span className="btn btn-ember mt-6">Click & collect</span>
          </a>
          <a href="/order/delivery" className="site-card block p-8 md:p-10">
            <p className="display text-[0.7rem] tracking-[0.2em] text-ember">Home delivery</p>
            <h2 className="serif mt-3 text-3xl">Delivered to your address.</h2>
            <p className="mt-3 text-sm text-mute">Order from either restaurant. We cook it and bring it to you.</p>
            <span className="btn btn-ember mt-6">Home delivery</span>
          </a>
        </div>
    </SitePage>
  );
}
