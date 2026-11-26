"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, SectionTitle, SitePage } from "@/components/ui";
import { locations, type LocationId } from "@/data/site";
import { formatBookingDate } from "@/lib/booking";
import { AccessCard, type AccessInfo } from "@/components/AccessCard";
import { MailNote } from "@/components/MailNote";
import type { MailBundle } from "@/lib/platform/mail-events";
import { PayFacts } from "@/components/PayFacts";
import { TrackPins, trackKindFrom } from "@/components/TrackPins";
import type { PaymentRow } from "@/lib/platform/pay";
import { StripePayAgain } from "@/components/StripePayAgain";
import { RefundStatement } from "@/components/RefundStatement";
import { refundQuote } from "@/lib/platform/pay";

type Payload = {
  booking?: {
    id?: string;
    ref: string;
    locationId: LocationId;
    visitType: string;
    date: string;
    time: string;
    guests: number;
    name: string;
    email: string;
    phone: string;
    notes?: string;
    status?: string;
    payments?: PaymentRow[];
  };
  party?: { code: string } | null;
  depositRequired?: boolean;
  depositAmount?: string;
  preorderRequired?: boolean;
  reminderText?: string;
  access?: AccessInfo | null;
  mail?: MailBundle | null;
};

export function ConfirmedClient() {
  const params = useSearchParams();
  const ref = params.get("ref")?.toUpperCase() || "";
  const enquiry = params.get("enquiry")?.toUpperCase() || "";
  const [data, setData] = useState<Payload | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (enquiry) {
      const cached = sessionStorage.getItem("dz-enquiry");
      if (cached) {
        const parsed = JSON.parse(cached);
        setData({
          booking: {
            ref: parsed.ref,
            locationId: parsed.locationId,
            visitType: "table",
            date: parsed.date,
            time: parsed.preferredTime,
            guests: parsed.guests,
            name: parsed.name,
            email: parsed.email,
            phone: parsed.phone,
            status: "ENQUIRY",
          },
          access: parsed.access,
          mail: parsed.mail,
        });
        return;
      }
    }
    const cached = sessionStorage.getItem("dz-booking");
    if (cached) {
      const parsed = JSON.parse(cached) as Payload;
      if (!ref || parsed.booking?.ref === ref) setData(parsed);
    }
    if (!ref) {
      if (!cached) setMissing(true);
      return;
    }
    fetch(`/api/book?ref=${encodeURIComponent(ref)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("missing");
        const live = await res.json();
        if (live.booking?.status === "CANCELLED") sessionStorage.removeItem("dz-booking");
        setData((current) => ({
          ...current,
          ...live,
          access: current?.access || live.access,
          mail: current?.mail || live.mail,
        }));
      })
      .catch(() => {
        if (!cached) setMissing(true);
      });
  }, [ref, enquiry]);

  if (missing) {
    return (
      <SitePage>
        <SectionTitle eyebrow="Reservations" title="We could not find that booking." copy="Start again or call the restaurant." />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/book">Book again</Button>
        </div>
      </SitePage>
    );
  }

  if (!data?.booking) return <div className="px-5 py-32 text-center text-mute">Loading…</div>;

  const booking = data.booking;
  const loc = locations[booking.locationId];
  const isEnquiry = booking.status === "ENQUIRY" || Boolean(enquiry);
  const waitingPay = booking.status === "PENDING_DEPOSIT";
  const cancelled = booking.status === "CANCELLED";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const partyUrl = data.party?.code && !waitingPay && !cancelled ? `${origin}/party/${data.party.code}` : "";

  return (
    <SitePage>
      <div>
        <p className="display text-[0.72rem] tracking-[0.28em] text-ember">
          {isEnquiry ? "Enquiry sent" : cancelled ? "Cancelled" : waitingPay ? "Waiting for payment" : "You’re booked"}
        </p>
        <h1 className="serif mt-3 text-4xl md:text-5xl">
          {isEnquiry
            ? "We’ll confirm your large group."
            : cancelled
              ? `Booking ${booking.ref} is cancelled`
              : waitingPay
                ? `Pay to confirm this table`
                : `${booking.visitType === "collection" ? "Collection" : "Table"} at ${loc.shortName}`}
        </h1>
        <p className="mt-3 text-mute">
          Reference <span className="text-ink">{booking.ref}</span>
        </p>
        <div className="mt-8">
          <p className="display text-[0.68rem] tracking-[0.18em] text-ember">Tracking</p>
          <TrackPins kind={trackKindFrom(undefined, booking.visitType, booking.status)} status={booking.status} />
        </div>

        <dl className="mt-10 divide-y divide-line border-y border-line text-sm">
          {[
            ["Restaurant", `${loc.name}, ${loc.address}`],
            ["When", `${formatBookingDate(booking.date)} at ${booking.time}`],
            ["Guests", String(booking.guests)],
            ["Name", booking.name],
            ["Contact", `${booking.email} · ${booking.phone}`],
            ...(data.depositRequired && data.depositAmount ? [["Deposit", data.depositAmount]] : []),
          ].map(([label, value]) => (
            <div key={label} className="grid gap-1 py-4 sm:grid-cols-3">
              <dt className="display text-[0.68rem] tracking-[0.18em] text-mute">{label}</dt>
              <dd className="sm:col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
        {booking.payments?.length ? (
          <dl className="account-meta mt-6">
            <PayFacts duePence={0} payments={booking.payments} />
          </dl>
        ) : null}
        {booking.id && waitingPay ? (
          <StripePayAgain
            locationId={booking.locationId}
            bookingId={booking.id}
            cancelPath={`/book/confirmed?ref=${booking.ref}`}
            label="Pay deposit to confirm"
          />
        ) : null}
        {cancelled ? (
          <RefundStatement
            quote={refundQuote({
              type: booking.visitType === "collection" ? "Collection" : "Book a table",
              name: booking.name,
              email: booking.email,
              payments: booking.payments,
            })}
            done
          />
        ) : null}

        {partyUrl ? (
          <div className="site-card mt-8 p-6">
            <p className="display text-[0.7rem] tracking-[0.2em] text-ember">Party menu</p>
            <p className="serif mt-2 text-2xl">Share this with everyone attending</p>
            <p className="mt-2 break-all text-sm">{partyUrl}</p>
            {data.preorderRequired ? <p className="mt-3 text-sm text-mute">Pre-order is required for this booking.</p> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href={`/party/${data.party.code}`}>Open party page</Button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigator.clipboard.writeText(partyUrl)}
              >
                Copy link
              </button>
              {data.reminderText ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigator.share?.({ text: data.reminderText, url: partyUrl }).catch(() => navigator.clipboard.writeText(data.reminderText || ""))}
                >
                  Send reminder
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <AccessCard access={data.access} />
        <MailNote email={booking.email} mail={data.mail} />

        <p className="mt-8 text-sm leading-relaxed text-mute">
          {isEnquiry
            ? "The restaurant will review this enquiry and come back to you."
            : cancelled || booking.status === "COMPLETED"
              ? `Need help? Call ${loc.phone} or email ${loc.email}.`
              : waitingPay
                ? "The table is only confirmed after Stripe takes the deposit. One email will come then, with the receipt and party menu."
                : "You can cancel this booking yourself. Paid money goes back to the same card or wallet."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/account">My Double Zero</Button>
          {!isEnquiry && booking.status !== "CANCELLED" && booking.status !== "COMPLETED" ? (
            <Button href={`/book/cancel?ref=${booking.ref}`} variant="ghost">
              Cancel this booking
            </Button>
          ) : null}
          <Button href="/menu" variant="ghost">
            See the menu
          </Button>
        </div>
      </div>
    </SitePage>
  );
}
