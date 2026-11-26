import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { locations, type LocationId } from "@/data/site";
import { findQrBySlug, scanBaseUrl } from "@/lib/platform/qr";
import { headers } from "next/headers";
import { PosterPrint } from "@/components/PosterPrint";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const qr = await findQrBySlug(slug);
  return {
    title: qr ? `${qr.name} poster` : "Poster",
    robots: { index: false, follow: false },
  };
}

export default async function QrPosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ base?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const qr = await findQrBySlug(slug);
  if (!qr) notFound();
  const loc = locations[qr.locationId as LocationId];
  if (!loc) notFound();
  const head = await headers();
  const fallback = scanBaseUrl(head.get("x-forwarded-host") || head.get("host"), head.get("x-forwarded-proto"));
  const raw = String(query.base || fallback).replace(/\/+$/, "");
  const base = /localhost|127\.0\.0\.1/i.test(raw) ? fallback : raw;

  return (
    <PosterPrint
      href={`${base}/go/${qr.slug}`}
      posterName={qr.name}
      restaurant={{
        shortName: loc.shortName,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        postcode: loc.postcode,
        phone: loc.phone,
        hours: loc.hours,
      }}
    />
  );
}
