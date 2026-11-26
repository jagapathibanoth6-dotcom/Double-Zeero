import { headers } from "next/headers";
import { locations } from "@/data/site";
import { db } from "@/lib/db";
import { requireBranch } from "@/lib/platform/admin";
import { listQrCodes, scanBaseUrl } from "@/lib/platform/qr";
import { getSettings } from "@/lib/platform/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { QrDesk } from "@/components/admin/QrDesk";
import { codesOfTable } from "@/lib/platform/booking";
import { todayISO } from "@/lib/booking";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const branch = await requireBranch();
  const head = await headers();
  const scanOrigin = scanBaseUrl(head.get("x-forwarded-host") || head.get("host"), head.get("x-forwarded-proto"));
  const [settings, codes, tables, held] = await Promise.all([
    getSettings(branch).then((row) => [row]),
    listQrCodes(branch),
    db.table.findMany({
      where: { locationId: branch },
      orderBy: [{ code: "asc" }],
    }),
    db.booking.findMany({
      where: {
        locationId: branch,
        date: { gte: todayISO() },
        visitType: { not: "collection" },
        status: { notIn: ["CANCELLED", "DECLINED"] },
      },
      select: { tableCodes: true },
    }),
  ]);
  const occupied = [...new Set(held.flatMap((booking) => codesOfTable(booking.tableCodes)))];
  const loc = locations[branch];
  return (
    <div className="settings-page">
      <div className="today-hero">
        <div>
          <p className="today-kicker">This restaurant</p>
          <h1 className="admin-page-title">Settings</h1>
          <p className="admin-page-copy">
            {loc.shortName} · QR posters, bookings, Stripe, hours, collection and delivery.
          </p>
        </div>
      </div>

      <QrDesk
        codes={codes}
        restaurant={{
          name: loc.name,
          shortName: loc.shortName,
          address: `${loc.address}, ${loc.postcode}`,
          phone: loc.phone,
        }}
        locationId={loc.id}
        bookingPath={loc.bookingPath}
        scanOrigin={scanOrigin}
      />

      {settings.map((row) => (
        <SettingsForm
          key={row.locationId}
          settings={{ ...row, uberApiKey: "", stripeSecretKey: "" }}
          tables={tables}
          occupied={occupied}
        />
      ))}
      {!settings.length ? <p className="today-empty">No settings saved for this restaurant yet.</p> : null}
    </div>
  );
}
