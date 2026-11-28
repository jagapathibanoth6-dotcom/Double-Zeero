import { notFound } from "next/navigation";
import { brand, locations, type LocationId } from "@/data/site";
import { findQrBySlug } from "@/lib/platform/qr";
import { addVia } from "@/lib/platform/via";

export const dynamic = "force-dynamic";

export default async function QrGoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const qr = await findQrBySlug(slug);
  if (!qr) notFound();
  const loc = locations[qr.locationId as LocationId];
  if (!loc) notFound();

  const via = qr.name || "QR";
  const actions = [
    { href: addVia(loc.bookingPath, via), kicker: "Inside", title: "Book a table", copy: `Reserve a table at ${loc.shortName}.` },
    { href: addVia(`/order/collect?location=${loc.id}`, via), kicker: "Takeaway", title: "Click & collect", copy: "Order now and collect from the counter." },
  ];

  return (
    <div className="qr-go">
      <p className="qr-go-brand">{brand.name}</p>
      <h1 className="qr-go-title">{loc.shortName}</h1>
      <p className="qr-go-copy">{loc.name}</p>
      <p className="qr-go-name">{qr.name}</p>
      <div className="qr-go-actions is-row">
        {actions.map((action) => (
          <a key={action.href} href={action.href} className="qr-go-card">
            <em>{action.kicker}</em>
            <strong>{action.title}</strong>
            <span>{action.copy}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
