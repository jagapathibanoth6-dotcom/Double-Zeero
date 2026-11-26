"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { locations, type LocationId } from "@/data/site";
import { formatBookingDate, todayISO } from "@/lib/booking";
import { formatMoney } from "@/lib/platform/money";
import { PayFacts, PayRefundBox } from "@/components/PayFacts";
import { TrackPins, trackKindFrom } from "@/components/TrackPins";

function placeName(id?: string) {
  return locations[id as LocationId]?.shortName || id || "Double Zero";
}

function statusText(value?: string) {
  return String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function orderTypeLabel(source?: string) {
  if (source === "CLICK_COLLECT") return "Click & collect";
  if (source === "DZ_DELIVERY") return "Home delivery";
  if (source === "POS") return "In restaurant";
  if (source === "PARTY") return "Party food";
  return "Order";
}

function orderIsDone(status?: string) {
  return status === "COMPLETED" || status === "CANCELLED";
}

function orderNeed(order: { source?: string; status?: string }) {
  const collect = order.source === "CLICK_COLLECT";
  const delivery = order.source === "DZ_DELIVERY";
  switch (order.status) {
    case "NEW":
      return "Sent to the kitchen";
    case "ACCEPTED":
      return "Accepted — waiting to start";
    case "PREPARING":
      return "Being made now";
    case "READY":
      return collect ? "Ready to collect" : delivery ? "Ready for the courier" : "Ready";
    case "DISPATCHED":
      return "On the way";
    case "COMPLETED":
      return collect ? "Collected" : delivery ? "Delivered" : "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return statusText(order.status);
  }
}

export function AccountDesk() {
  const [data, setData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [manageOrder, setManageOrder] = useState<any>(null);
  const [manageSource, setManageSource] = useState("CLICK_COLLECT");
  const [manageLocation, setManageLocation] = useState<LocationId>("manchester");
  const [manageAsap, setManageAsap] = useState(false);
  const [manageDate, setManageDate] = useState("");
  const [manageTime, setManageTime] = useState("");
  const [manageAddress, setManageAddress] = useState("");
  const [manageNotes, setManageNotes] = useState("");
  const [manageBooking, setManageBooking] = useState<any>(null);
  const [manageVisit, setManageVisit] = useState<"table" | "collection">("table");
  const [manageGuests, setManageGuests] = useState(2);
  const [manageHighchair, setManageHighchair] = useState(false);

  async function load() {
    const res = await fetch("/api/account");
    const json = await res.json();
    setData(json);
    if (json.customer) {
      setName(json.customer.name);
      setPhone(json.customer.phone || "");
      setEmail(json.customer.email);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) return setError(json.error || "Could not sign in.");
    load();
  }

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not update.");
      return false;
    }
    setMessage(json.message || "Saved.");
    setError("");
    await load();
    return true;
  }

  function openDetails() {
    setError("");
    setPassword("");
    setName(data?.customer?.name || name);
    setPhone(data?.customer?.phone || phone);
    setEmail(data?.customer?.email || email);
    setDetailsOpen(true);
  }

  function openManageBooking(booking: any) {
    setError("");
    setManageOrder(null);
    setManageBooking(booking);
    setManageVisit(booking.visitType === "collection" ? "collection" : "table");
    setManageLocation(booking.locationId === "chorlton" ? "chorlton" : "manchester");
    setManageDate(booking.date || "");
    setManageTime(booking.time || "");
    setManageGuests(booking.guests || 2);
    setManageNotes(booking.notes || "");
    setManageHighchair(Boolean(booking.highchair));
  }

  async function saveBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!manageBooking) return;
    setError("");
    const ok = await post({
      action: "update_booking",
      bookingId: manageBooking.id,
      visitType: manageVisit,
      locationId: manageLocation,
      date: manageDate,
      time: manageTime,
      guests: manageGuests,
      notes: manageNotes,
      highchair: manageHighchair,
    });
    if (ok) setManageBooking(null);
  }

  function openManage(order: any) {
    setError("");
    setManageBooking(null);
    setManageOrder(order);
    setManageSource(order.source === "DZ_DELIVERY" ? "DZ_DELIVERY" : "CLICK_COLLECT");
    setManageLocation(order.locationId === "chorlton" ? "chorlton" : "manchester");
    setManageAsap(Boolean(order.asap));
    setManageDate(order.date || "");
    setManageTime(order.time || "");
    setManageAddress(order.address || "");
    setManageNotes(order.notes || "");
  }

  async function saveOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!manageOrder) return;
    setError("");
    const ok = await post({
      action: "update_order",
      orderId: manageOrder.id,
      source: manageSource,
      locationId: manageLocation,
      asap: manageAsap,
      date: manageDate,
      time: manageTime,
      address: manageAddress,
      notes: manageNotes,
    });
    if (ok) setManageOrder(null);
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const ok = await post({ action: "update_details", name, phone, email, password });
    if (ok) {
      setPassword("");
      setDetailsOpen(false);
    }
  }

  if (!data) return <div className="account-loading">Loading your account…</div>;

  if (!data.customer) {
    return (
      <section className="account-login-screen">
        <aside className="account-login-visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/food-1.jpg" alt="" />
          <div className="account-login-visual-shade" />
          <div className="account-login-visual-copy">
            <p className="display text-[0.7rem] tracking-[0.28em] text-gold">Manchester · Chorlton</p>
            <h1 className="serif mt-4 text-4xl leading-tight text-cream md:text-5xl">
              Your tables, collections and deliveries.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/75">
              One login for bookings, click & collect, home delivery and party menus.
            </p>
          </div>
        </aside>
        <div className="account-login-panel">
          <form onSubmit={login} className="account-login-form">
            <p className="account-kicker">Account</p>
            <h2 className="serif mt-3 text-4xl md:text-5xl">Sign in</h2>
            <p className="mt-3 text-sm leading-relaxed text-mute">
              Use the email and temporary password we sent after you booked or ordered.
            </p>
            <div className="account-fields">
              <label className="account-field" htmlFor="account-email">
                <span>Email</span>
                <input
                  id="account-email"
                  placeholder="name@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label className="account-field" htmlFor="account-password">
                <span>Password</span>
                <input
                  id="account-password"
                  placeholder="Temporary password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </label>
              {error ? <p className="account-alert">{error}</p> : null}
              <button className="btn btn-ember w-full" type="submit">
                Sign in to my account
              </button>
            </div>
            <div className="account-login-links">
              <Link href="/book">Book a table</Link>
              <Link href="/order/collect">Click & collect</Link>
              <Link href="/order/delivery">Home delivery</Link>
            </div>
          </form>
        </div>
      </section>
    );
  }

  const upcomingBookings = data.bookings.filter((b: any) => b.status !== "CANCELLED" && b.status !== "COMPLETED");
  const pastBookings = data.bookings.filter((b: any) => b.status === "CANCELLED" || b.status === "COMPLETED");
  const upcomingOrders = data.orders.filter((order: any) => !orderIsDone(order.status));
  const doneOrders = data.orders.filter((order: any) => orderIsDone(order.status));

  return (
    <div className="account-app">
      <header className="account-hero">
        <div className="account-hero-inner">
          <p className="account-kicker is-light">Your Double Zero</p>
          <h1 className="serif mt-3 text-4xl text-cream md:text-5xl">Hello, {data.customer.name}</h1>
          <p className="mt-2 text-cream/65">{data.customer.email}</p>
          <div className="account-actions">
            <Link href="/book" className="btn btn-ember">
              Book a table
            </Link>
            <Link href="/order/collect" className="btn btn-ghost-light">
              Click & collect
            </Link>
            <Link href="/order/delivery" className="btn btn-ghost-light">
              Home delivery
            </Link>
            <button type="button" className="btn btn-ghost-light" onClick={openDetails}>
              Update details
            </button>
            <button type="button" className="btn btn-ghost-light" onClick={() => post({ action: "logout" })}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="account-body">

        <section className="account-offers-row">
          <div className="account-block-head">
            <h2>Offers</h2>
            <span>{data.offers.length || "None"}</span>
          </div>
          <ul className="account-offer-grid">
            {data.offers.map((offer: any) => (
              <li key={offer.id} className="site-card account-offer-card">
                <p className="display text-[0.62rem] tracking-[0.16em] text-ember">{offer.percentOff}% off</p>
                <h3 className="serif mt-2 text-2xl leading-tight">{offer.name}</h3>
                <p className="mt-2 text-sm text-mute">
                  {offer.orderType === "CLICK_COLLECT"
                    ? "Click & collect"
                    : offer.orderType === "DZ_DELIVERY"
                      ? "Home delivery"
                      : offer.orderType
                        ? offer.orderType.replace(/_/g, " ")
                        : "Any order"}
                  {offer.minSpendPence ? ` · min ${formatMoney(offer.minSpendPence)}` : ""}
                </p>
              </li>
            ))}
            {!data.offers.length ? <li className="site-card account-empty">No offers just now.</li> : null}
          </ul>
        </section>

        {data.customer.mustChangePassword ? (
          <p className="mt-4 text-sm text-ember">Please update your temporary password in Update details.</p>
        ) : null}

        {manageBooking ? (
          <div className="account-dialog" role="dialog" aria-modal="true" aria-label="Manage booking">
            <button type="button" className="account-dialog-back" onClick={() => setManageBooking(null)} aria-label="Close" />
            <form className="account-dialog-card is-wide" onSubmit={saveBooking}>
              <p className="display text-[0.68rem] tracking-[0.2em] text-ember">Booking {manageBooking.ref}</p>
              <h2 className="serif mt-2 text-3xl">Manage booking</h2>
              <p className="mt-2 text-sm text-mute">Change the type and options, or cancel for a refund.</p>
              <div className="account-dialog-grid">
                <fieldset>
                  <legend>Type</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(locations[manageLocation].visitTypes.includes("table") || manageVisit === "table") ? (
                      <button type="button" className="slot" aria-pressed={manageVisit === "table"} onClick={() => setManageVisit("table")}>
                        Book a table
                      </button>
                    ) : null}
                    {(locations[manageLocation].visitTypes.includes("collection") || manageVisit === "collection") ? (
                      <button type="button" className="slot" aria-pressed={manageVisit === "collection"} onClick={() => setManageVisit("collection")}>
                        Collection
                      </button>
                    ) : null}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Restaurant</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(Object.keys(locations) as LocationId[]).map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="slot"
                        aria-pressed={manageLocation === id}
                        onClick={() => {
                          setManageLocation(id);
                          if (!locations[id].visitTypes.includes(manageVisit)) setManageVisit(locations[id].visitTypes[0]);
                        }}
                      >
                        {locations[id].shortName}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="booking-date">Date</label>
                  <input id="booking-date" type="date" min={todayISO()} value={manageDate} onChange={(e) => setManageDate(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="booking-time">Time</label>
                  <input id="booking-time" type="time" value={manageTime} onChange={(e) => setManageTime(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="booking-guests">Guests</label>
                  <input id="booking-guests" type="number" min={1} max={40} value={manageGuests} onChange={(e) => setManageGuests(Number(e.target.value))} />
                </div>
                {manageLocation === "manchester" ? (
                  <label className="account-dialog-asap">
                    <input type="checkbox" checked={manageHighchair} onChange={(e) => setManageHighchair(e.target.checked)} />
                    Highchair or pram
                  </label>
                ) : (
                  <div />
                )}
                <div className="is-wide">
                  <label htmlFor="booking-notes">Options / notes</label>
                  <textarea id="booking-notes" value={manageNotes} onChange={(e) => setManageNotes(e.target.value)} placeholder="Allergies, occasion…" />
                </div>
                <PayRefundBox duePence={0} payments={manageBooking.payments} kind="booking" />
              </div>
              {error ? <p className="mt-4 text-sm text-ember">{error}</p> : null}
              <div className="account-dialog-actions">
                <button className="btn btn-ember" type="submit">
                  Save changes
                </button>
                <Link href={`/account/cancel/booking/${manageBooking.id}`} className="btn btn-ghost">
                  Cancel booking
                </Link>
                <button type="button" className="account-dialog-cancel" onClick={() => setManageBooking(null)}>
                  Close
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {manageOrder ? (
          <div className="account-dialog" role="dialog" aria-modal="true" aria-label="Manage order">
            <button type="button" className="account-dialog-back" onClick={() => setManageOrder(null)} aria-label="Close" />
            <form className="account-dialog-card is-wide" onSubmit={saveOrder}>
              <p className="display text-[0.68rem] tracking-[0.2em] text-ember">Order {manageOrder.ref}</p>
              <h2 className="serif mt-2 text-3xl">Manage order</h2>
              <p className="mt-2 text-sm text-mute">Change the type and options, or cancel for a refund while this order is still underway.</p>
              <div className="account-dialog-grid">
                <fieldset>
                  <legend>Type</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" className="slot" aria-pressed={manageSource === "CLICK_COLLECT"} onClick={() => setManageSource("CLICK_COLLECT")}>
                      Click & collect
                    </button>
                    <button type="button" className="slot" aria-pressed={manageSource === "DZ_DELIVERY"} onClick={() => setManageSource("DZ_DELIVERY")}>
                      Home delivery
                    </button>
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Restaurant</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(Object.keys(locations) as LocationId[]).map((id) => (
                      <button key={id} type="button" className="slot" aria-pressed={manageLocation === id} onClick={() => setManageLocation(id)}>
                        {locations[id].shortName}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="manage-date">Date</label>
                  <input id="manage-date" type="date" min={todayISO()} value={manageDate} onChange={(e) => setManageDate(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="manage-time">Time</label>
                  <input id="manage-time" type="time" value={manageTime} disabled={manageAsap} onChange={(e) => setManageTime(e.target.value)} />
                </div>
                <label className="account-dialog-asap">
                  <input type="checkbox" checked={manageAsap} onChange={(e) => setManageAsap(e.target.checked)} />
                  ASAP
                </label>
                {manageSource === "DZ_DELIVERY" ? (
                  <div className="is-wide">
                    <label htmlFor="manage-address">Home address</label>
                    <textarea id="manage-address" value={manageAddress} onChange={(e) => setManageAddress(e.target.value)} required />
                  </div>
                ) : null}
                <div className="is-wide">
                  <label htmlFor="manage-notes">Options / notes</label>
                  <textarea id="manage-notes" value={manageNotes} onChange={(e) => setManageNotes(e.target.value)} placeholder="Extra hot, leave at the door…" />
                </div>
                <PayRefundBox
                  duePence={manageOrder.totalPence}
                  payments={manageOrder.payments}
                  kind="order"
                  kitchenStarted={["PREPARING", "READY", "DISPATCHED"].includes(manageOrder.status)}
                />
              </div>
              {error ? <p className="mt-4 text-sm text-ember">{error}</p> : null}
              <div className="account-dialog-actions">
                <button className="btn btn-ember" type="submit">
                  Save changes
                </button>
                <Link href={`/account/cancel/order/${manageOrder.id}`} className="btn btn-ghost">
                  Cancel order
                </Link>
                <button type="button" className="account-dialog-cancel" onClick={() => setManageOrder(null)}>
                  Close
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {detailsOpen ? (
          <div className="account-dialog" role="dialog" aria-modal="true" aria-label="Update details">
            <button type="button" className="account-dialog-back" onClick={() => setDetailsOpen(false)} aria-label="Close" />
            <form className="account-dialog-card" onSubmit={saveDetails}>
              <p className="display text-[0.68rem] tracking-[0.2em] text-ember">Account</p>
              <h2 className="serif mt-2 text-3xl">Update details</h2>
              <p className="mt-2 text-sm text-mute">Change your name, mobile, email and password.</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="details-name">Name</label>
                  <input id="details-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="details-phone">Mobile</label>
                  <input id="details-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="details-email">Email</label>
                  <input id="details-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="details-password">Password</label>
                  <input
                    id="details-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={data.customer.mustChangePassword ? "New password" : "Leave blank to keep current"}
                    autoComplete="new-password"
                  />
                </div>
                {error ? <p className="text-sm text-ember">{error}</p> : null}
                <button className="btn btn-ember w-full" type="submit">
                  Save details
                </button>
                <button type="button" className="account-dialog-cancel" onClick={() => setDetailsOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-ember">{error}</p> : null}
        {message ? <p className="mt-4 text-sm">{message}</p> : null}

        <section className="account-block">
          <div className="account-block-head">
            <h2>Upcoming</h2>
            <span>{upcomingBookings.length + upcomingOrders.length || "None"}</span>
          </div>
          <ul className="account-grid">
            {upcomingBookings.map((booking: any) => {
              return (
                <li key={booking.id} className="site-card account-card">
                  <div className="account-card-top">
                    <p className="account-card-kicker">{booking.visitType === "collection" ? "Collection" : "Table"}</p>
                    <span className="account-status">{statusText(booking.status)}</span>
                  </div>
                  <h3 className="serif text-2xl leading-tight">
                    {formatBookingDate(booking.date)}
                    <span> · {booking.time}</span>
                  </h3>
                  <TrackPins kind={trackKindFrom(undefined, booking.visitType, booking.status)} status={booking.status} compact />
                  <dl className="account-meta">
                    <div>
                      <dt>Type</dt>
                      <dd>{booking.visitType === "collection" ? "Collection" : "Book a table"}</dd>
                    </div>
                    <div>
                      <dt>Restaurant</dt>
                      <dd>{placeName(booking.locationId)}</dd>
                    </div>
                    <div>
                      <dt>Guests</dt>
                      <dd>{booking.guests}</dd>
                    </div>
                    <div>
                      <dt>Reference</dt>
                      <dd>{booking.ref}</dd>
                    </div>
                    <PayFacts duePence={0} payments={booking.payments} />
                  </dl>
                  <div className="account-card-actions">
                    <button type="button" onClick={() => openManageBooking(booking)}>
                      Manage
                    </button>
                    <Link href={`/account/cancel/booking/${booking.id}`}>Cancel</Link>
                    {booking.party ? (
                      <Link href={`/party/${booking.party.code}`}>Party menu</Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
            <OrderList orders={upcomingOrders} onManage={openManage} />
            {!upcomingBookings.length && !upcomingOrders.length ? <li className="site-card account-empty">Nothing upcoming.</li> : null}
          </ul>
        </section>

        <section className="account-block">
          <div className="account-block-head">
            <h2>Already done</h2>
            <span>{pastBookings.length + doneOrders.length || "None"}</span>
          </div>
          <ul className="account-grid">
            {pastBookings.map((booking: any) => (
              <li key={booking.id} className="site-card account-card is-past">
                <div className="account-card-top">
                  <p className="account-card-kicker">{booking.visitType === "collection" ? "Collection" : "Table"}</p>
                  <span className="account-status">{statusText(booking.status)}</span>
                </div>
                <h3 className="serif text-2xl leading-tight">
                  {formatBookingDate(booking.date)}
                  <span> · {booking.time}</span>
                </h3>
                <TrackPins kind={trackKindFrom(undefined, booking.visitType, booking.status)} status={booking.status} compact />
                <dl className="account-meta">
                  <div>
                    <dt>Type</dt>
                    <dd>{booking.visitType === "collection" ? "Collection" : "Book a table"}</dd>
                  </div>
                  <div>
                    <dt>Restaurant</dt>
                    <dd>{placeName(booking.locationId)}</dd>
                  </div>
                  <div>
                    <dt>Reference</dt>
                    <dd>{booking.ref}</dd>
                  </div>
                  <PayFacts duePence={0} payments={booking.payments} />
                </dl>
              </li>
            ))}
            <OrderList orders={doneOrders} done />
            {!pastBookings.length && !doneOrders.length ? <li className="site-card account-empty">Nothing finished yet.</li> : null}
          </ul>
        </section>

        {data.enquiries.length || data.waitlist.length ? (
          <section className="account-block">
            <div className="account-block-head">
              <h2>Enquiries & waitlist</h2>
            </div>
            <ul className="account-grid">
              {data.enquiries.map((enquiry: any) => (
                <li key={enquiry.id} className="site-card account-card">
                  <div className="account-card-top">
                    <p className="account-card-kicker">Enquiry</p>
                    <span className="account-status">{statusText(enquiry.status)}</span>
                  </div>
                  <h3 className="serif text-2xl leading-tight">
                    {formatBookingDate(enquiry.date)}
                    {enquiry.preferredTime ? <span> · {enquiry.preferredTime}</span> : null}
                  </h3>
                  <dl className="account-meta">
                    <div>
                      <dt>Guests</dt>
                      <dd>{enquiry.guests}</dd>
                    </div>
                    <div>
                      <dt>Reference</dt>
                      <dd>{enquiry.ref}</dd>
                    </div>
                  </dl>
                </li>
              ))}
              {data.waitlist.map((entry: any) => (
                <li key={entry.id} className="site-card account-card">
                  <div className="account-card-top">
                    <p className="account-card-kicker">Waitlist</p>
                    <span className="account-status">{statusText(entry.status)}</span>
                  </div>
                  <h3 className="serif text-2xl leading-tight">
                    {formatBookingDate(entry.date)}
                    {entry.time ? <span> · {entry.time}</span> : null}
                  </h3>
                  <dl className="account-meta">
                    <div>
                      <dt>Guests</dt>
                      <dd>{entry.guests}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

      </div>
    </div>
  );
}

function OrderList({ orders, done = false, onManage }: { orders: any[]; done?: boolean; onManage?: (order: any) => void }) {
  if (!orders.length) return null;
  return (
    <>
      {orders.map((order) => {
        return (
          <li key={order.id} className={`site-card account-card ${done ? "is-past" : ""}`}>
            <div className="account-card-top">
              <p className="account-card-kicker">{orderTypeLabel(order.source)}</p>
              <span className="account-status">{orderNeed(order)}</span>
            </div>
            <h3 className="serif text-2xl leading-tight">{formatMoney(order.totalPence)}</h3>
            <TrackPins kind={trackKindFrom(order.source)} status={order.status} compact />
            <dl className="account-meta">
              <div>
                <dt>Type</dt>
                <dd>{orderTypeLabel(order.source)}</dd>
              </div>
              <div>
                <dt>When</dt>
                <dd>{order.asap ? "ASAP" : `${order.date ? formatBookingDate(order.date) : ""} ${order.time || ""}`.trim()}</dd>
              </div>
              <div>
                <dt>Restaurant</dt>
                <dd>{placeName(order.locationId)}</dd>
              </div>
              {order.address ? (
                <div className="is-wide">
                  <dt>Address</dt>
                  <dd>{order.address}</dd>
                </div>
              ) : null}
              <div>
                <dt>Reference</dt>
                <dd>{order.ref}</dd>
              </div>
              <PayFacts duePence={order.totalPence} payments={order.payments} />
              <div className="is-wide">
                <dt>Items</dt>
                <dd>{order.items.map((item: any) => `${item.quantity} × ${item.name}`).join(", ") || "No items"}</dd>
              </div>
            </dl>
            <div className="account-card-actions">
              {!done && onManage ? (
                <button type="button" onClick={() => onManage(order)}>
                  Manage
                </button>
              ) : null}
              {!done ? <Link href={`/account/cancel/order/${order.id}`}>Cancel</Link> : null}
              <Link href={`/order/confirmed?ref=${order.ref}`}>{done ? "View" : "Track"}</Link>
            </div>
          </li>
        );
      })}
    </>
  );
}
