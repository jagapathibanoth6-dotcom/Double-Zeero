import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { randomCode } from "@/lib/platform/money";

export type QrRow = {
  id: string;
  locationId: string;
  name: string;
  slug: string;
  createdAt: Date | string;
};

function newId() {
  return `qr_${randomBytes(12).toString("hex")}`;
}

export async function listQrCodes(locationId: string) {
  return db.$queryRaw<QrRow[]>`
    SELECT id, locationId, name, slug, createdAt
    FROM QrCode
    WHERE locationId = ${locationId}
    ORDER BY createdAt DESC
  `;
}

export async function findQrBySlug(slug: string) {
  const rows = await db.$queryRaw<QrRow[]>`
    SELECT id, locationId, name, slug, createdAt
    FROM QrCode
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function findQrById(id: string) {
  const rows = await db.$queryRaw<QrRow[]>`
    SELECT id, locationId, name, slug, createdAt
    FROM QrCode
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function createQrCode(locationId: string, name: string) {
  let slug = randomCode(6);
  for (let i = 0; i < 6; i += 1) {
    const exists = await findQrBySlug(slug);
    if (!exists) break;
    slug = randomCode(6);
  }
  const row: QrRow = {
    id: newId(),
    locationId,
    name,
    slug,
    createdAt: new Date(),
  };
  await db.$executeRaw`
    INSERT INTO QrCode (id, locationId, name, slug, createdAt)
    VALUES (${row.id}, ${row.locationId}, ${row.name}, ${row.slug}, ${row.createdAt.toISOString()})
  `;
  return row;
}

export async function deleteQrCode(id: string) {
  await db.$executeRaw`DELETE FROM QrCode WHERE id = ${id}`;
}

export function scanBaseUrl(hostHeader?: string | null, proto?: string | null) {
  const host = String(hostHeader || "").replace(/\/+$/, "");
  if (host && !/^(localhost|127\.0\.0\.1)(:|$)/i.test(host)) {
    const protocol = proto === "https" ? "https" : "http";
    return `${protocol}://${host}`;
  }
  return "http://192.168.1.130:3000";
}
