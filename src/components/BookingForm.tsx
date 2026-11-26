"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { locations, type LocationId, type VisitType } from "@/data/site";
import { formatBookingDate, todayISO } from "@/lib/booking";
import { formatMoney } from "@/lib/platform/money";
import { PaySheet } from "@/components/PaySheet";
import { startStripeCheckout } from "@/lib/platform/stripe-client";

type Slot = { time: string; available: boolean; used?: number; cap?: number };
type Settings = {
  largeFrom: number;
  maxAutoBooking: number;
  enquiryFrom: number;
  depositEnabled: boolean;
  depositType: string;
  depositAmountPence: number;
  depositFrom: number;
  preorderEnabled: boolean;
  preorderFrom: number;
  waitlistEnabled: boolean;
};

export function BookingForm({ locationId }: { locationId: LocationId }) {
  const loc = locations[locationId];
  const router = useRouter();
  const [source, setSource] = useState("website");
  const [visitType, setVisitType] = useState<VisitType>(loc.visitTypes[0]);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [highchair, setHighchair] = useState(false);
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [band, setBand] = useState("NORMAL");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [paymentMode, setPaymentMode] = useState("INDIVIDUAL");
  const [payDeposit, setPayDeposit] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSource(params.get("source") || params.get("via") || "website");
    fetch(`/api/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId }),
    }).catch(() => undefined);
    fetch(`/api/pay/ready?locationId=${locationId}`)
      .then((res) => res.json())
      .then((data) => setStripeReady(Boolean(data.ready)))
      .catch(() => setStripeReady(false));
  }, [locationId]);

  useEffect(() => {
    const q = new URLSearchParams({ locationId, date, guests: String(guests), visitType });
    fetch(`/api/book/diary?${q}`)
      .then((res) => res.json())
      .then((data) => {
        setSlots(Array.isArray(data.slots) ? data.slots : []);
        setSettings(data.settings || null);
        setBand(data.band || "NORMAL");
        if (data.error) setError(data.error);
      })
      .catch(() => setError("Could not load times."));
  }, [locationId, date, guests, visitType]);

  useEffect(() => {
    if (time && !slots.some((s) => s.time === time && s.available)) setTime("");
  }, [slots, time]);

  const enquiry = band === "ENQUIRY";
  const large = band === "LARGE";
  const selected = slots.find((s) => s.time === time);
  const nearby = useMemo(() => {
    const idx = slots.findIndex((s) => s.time === time);
    return slots.filter((s, i) => s.available && (time ? Math.abs(i - idx) <= 3 && s.time !== time : true)).slice(0, 5);
  }, [slots, time]);
  const depositPence =
    settings && large && settings.depositEnabled && guests >= settings.depositFrom
      ? settings.depositType === "PER_PERSON"
        ? settings.depositAmountPence * guests
        : settings.depositAmountPence
      : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (enquiry) {
      setSending(true);
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          date,
          preferredTime: time || "19:30",
          guests,
          name,
          email,
          phone,
          occasion: notes,
          message: notes,
        }),
      });
      const data = await res.json();
      setSending(false);
      if (!res.ok) return setError(data.error || "Could not send enquiry.");
      sessionStorage.setItem("dz-enquiry", JSON.stringify({ ...data.enquiry, access: data.access, mail: data.mail }));
      router.push(`/book/confirmed?enquiry=${data.enquiry.ref}`);
      return;
    }
    if (!time) return setError("Choose a time.");
    if (!selected?.available) return setError("That time is full.");
    if (large && payDeposit && depositPence > 0) {
      if (stripeReady) {
        await placeBooking(true);
        return;
      }
      setPayOpen(true);
      return;
    }
    await placeBooking();
  }

  async function placeBooking(useStripe = false) {
    setSending(true);
    const takeDeposit = Boolean(large && payDeposit && depositPence > 0);
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        visitType,
        date,
        time,
        guests,
        name,
        email,
        phone,
        highchair,
        notes,
        source,
        payDeposit: takeDeposit && !useStripe,
        paymentMode,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSending(false);
      return setError(data.error || "Could not complete the booking.");
    }
    if (useStripe && takeDeposit && data.booking?.id) {
      try {
        await startStripeCheckout({
          locationId,
          bookingId: data.booking.id,
          cancelPath: `/book/confirmed?ref=${data.booking.ref}`,
        });
      } catch (error) {
        setSending(false);
        setError(error instanceof Error ? error.message : "Could not start payment.");
      }
      return;
    }
    setSending(false);
    sessionStorage.setItem("dz-booking", JSON.stringify(data));
    router.push(`/book/confirmed?ref=${data.booking.ref}`);
  }

  async function joinWaitlist() {
    setError("");
    if (!name || !email || !phone) return setError("Add your details first, then join the waitlist.");
    const res = await fetch("/api/book/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, date, time: time || "19:30", guests, name, email, phone }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Could not join waitlist.");
    setMessage("You’re on the waiting list. We’ll hold the request for this sitting.");
  }

  const kinds = [
    {
      type: "table" as VisitType,
      kicker: "Reserve",
      title: "Book a table",
      copy: `A sitting at ${loc.shortName}.`,
    },
    ...(loc.visitTypes.includes("collection")
      ? [
          {
            type: "collection" as VisitType,
            kicker: "Takeaway",
            title: "Collection slot",
            copy: "Reserve a pickup time at the counter.",
          },
        ]
      : []),
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <fieldset>
        <legend className="display mb-3 text-[0.72rem] tracking-[0.2em] text-mute">What would you like?</legend>
        <div className={`journey-choices is-paper ${kinds.length === 1 ? "is-one" : ""}`}>
          {kinds.map((kind) => (
            <button
              key={kind.type}
              type="button"
              className={`journey-card ${visitType === kind.type ? "is-on" : ""}`}
              aria-pressed={visitType === kind.type}
              onClick={() => setVisitType(kind.type)}
            >
              <em>{kind.kicker}</em>
              <strong>{kind.title}</strong>
              <span>{kind.copy}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            required
            min={todayISO()}
            max={new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString().slice(0, 10)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="guests">Guests</label>
          <select id="guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1 guest" : `${n} guests`}
                {settings && n >= settings.enquiryFrom
                  ? " — enquiry"
                  : settings && n >= settings.largeFrom
                    ? " — large party"
                    : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {enquiry ? (
        <div className="site-card p-5 text-sm leading-relaxed">
          Parties of {settings?.enquiryFrom || 21}+ are a large-group enquiry. The restaurant will confirm by phone or
          email, then you can pay a deposit and share a party menu.
        </div>
      ) : large ? (
        <div className="site-card p-5 text-sm leading-relaxed">
          Large group booking.{" "}
          {depositPence > 0 ? `A ${formatMoney(depositPence)} deposit is required. ` : ""}
          {settings?.preorderEnabled && guests >= (settings.preorderFrom || 10)
            ? `Food pre-order is required from ${settings.preorderFrom} guests.`
            : ""}
        </div>
      ) : null}

      <div>
        <p className="display mb-3 text-[0.72rem] tracking-[0.2em] text-mute">
          {visitType === "collection" ? "Collection time" : "Sitting"} · {date ? formatBookingDate(date) : ""}
        </p>
        {visitType === "table" && slots.length ? (
          <p className="mb-3 text-sm text-mute">
            {slots.filter((slot) => slot.available).length
              ? `Open times already count everyone sat in that sitting. Tables can be joined for ${guests === 1 ? "1 guest" : `${guests} guests`}.`
              : `No sitting can take ${guests === 1 ? "1 guest" : `${guests} guests`} after the people already booked. Try another day or a smaller party.`}
          </p>
        ) : null}
        {slots.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                className="slot"
                disabled={!slot.available && !enquiry}
                aria-pressed={time === slot.time}
                onClick={() => setTime(slot.time)}
              >
                {slot.time}
                {!slot.available ? " full" : ""}
              </button>
            ))}
          </div>
        ) : (
          <p className="site-card p-4 text-sm text-mute">No times on this date. Try another day.</p>
        )}
      </div>

      {time && selected && !selected.available && !enquiry ? (
        <div className="site-card p-5 text-sm">
          <p>Sorry, we’re fully booked at {time}.</p>
          {nearby.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {nearby.map((slot) => (
                <button key={slot.time} type="button" className="slot" onClick={() => setTime(slot.time)}>
                  {slot.time} available
                </button>
              ))}
            </div>
          ) : null}
          {settings?.waitlistEnabled ? (
            <button type="button" className="btn btn-ghost mt-4" onClick={joinWaitlist}>
              Join waitlist
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name">Name</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      {locationId === "manchester" ? (
        <label className="flex items-center gap-3 text-sm normal-case tracking-normal text-ink" style={{ fontFamily: "var(--font-sans)", letterSpacing: 0 }}>
          <input type="checkbox" className="h-4 w-4 min-h-0 w-auto" checked={highchair} onChange={(e) => setHighchair(e.target.checked)} />
          We will need a highchair or pram space
        </label>
      ) : null}

      {large && visitType === "table" ? (
        <div>
          <label htmlFor="paymode">Party payment</label>
          <select id="paymode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            <option value="INDIVIDUAL">Everyone pays for their own food</option>
            <option value="HOST">Host pays the balance</option>
            <option value="DEPOSIT_AND_INDIVIDUAL">Deposit now, guests pay individually</option>
          </select>
          {depositPence > 0 ? (
            <label className="mt-3 flex items-center gap-3 text-sm normal-case tracking-normal text-ink" style={{ fontFamily: "var(--font-sans)", letterSpacing: 0 }}>
              <input type="checkbox" className="h-4 w-4 min-h-0 w-auto" checked={payDeposit} onChange={(e) => setPayDeposit(e.target.checked)} />
              Pay {formatMoney(depositPence)} deposit now
            </label>
          ) : null}
        </div>
      ) : null}

      <div>
        <label htmlFor="notes">{enquiry ? "Occasion, food requirements, message" : "Notes (allergies, occasion)"}</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error ? <p className="text-sm text-ember">{error}</p> : null}
      {message ? <p className="text-sm text-ink">{message}</p> : null}

      <PaySheet
        open={payOpen}
        amountPence={depositPence}
        title="Pay booking deposit"
        details={[
          { label: "Name", value: name },
          { label: "Email", value: email },
          { label: "Booking", value: visitType === "collection" ? "Collection" : "Book a table" },
          { label: "Restaurant", value: `${loc.shortName} · ${loc.address}, ${loc.postcode}` },
          { label: "When", value: `${formatBookingDate(date)}${time ? ` · ${time}` : ""} · ${guests === 1 ? "1 guest" : `${guests} guests`}` },
        ]}
        locationId={locationId}
        onClose={() => setPayOpen(false)}
        onPaid={(result) => {
          setPayOpen(false);
          placeBooking(result.method === "STRIPE");
        }}
      />
      <div className="book-confirm">
        <p className="book-confirm-kicker">{visitType === "collection" ? "Collection" : "Table booking"}</p>
        <p className="book-confirm-title">{loc.shortName}</p>
        <p className="book-confirm-meta">
          {date ? formatBookingDate(date) : "Choose a date"}
          {time ? ` · ${time}` : " · choose a time"}
          {` · ${guests === 1 ? "1 guest" : `${guests} guests`}`}
        </p>
        <p className="book-confirm-copy">{loc.address}, {loc.postcode}</p>
        <button type="submit" className="btn btn-ember" disabled={sending}>
          {sending
            ? "Sending…"
            : enquiry
              ? "Send enquiry"
              : large
                ? "Book large group"
                : visitType === "collection"
                  ? "Confirm collection"
                  : "Confirm table"}
        </button>
      </div>
    </form>
  );
}
