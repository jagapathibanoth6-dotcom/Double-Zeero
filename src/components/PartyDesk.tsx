"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { locations, type LocationId } from "@/data/site";
import { formatBookingDate } from "@/lib/booking";
import { formatMoney } from "@/lib/platform/money";
import { PaySheet } from "@/components/PaySheet";
import type { PartyView } from "@/lib/platform/party";

type Guest = {
  id: string;
  name: string;
  ordered: boolean;
  totalPence: number;
  paid: boolean;
  items: { productId?: string | null; name: string; quantity: number; unitPence: number }[];
};
type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  prices: { pricePence: number; label: string }[];
};

export function PartyDesk({ code }: { code: string }) {
  const [party, setParty] = useState<PartyView | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0, reminderText: "" });
  const [guestId, setGuestId] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [names, setNames] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [basket, setBasket] = useState<{ productId: string; name: string; quantity: number; unitPence: number }[]>([]);
  const [message, setMessage] = useState("");
  const [payOpen, setPayOpen] = useState<"guest" | "host" | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/party/${code}`);
    const data = await res.json();
    if (!res.ok) return;
    setParty(data.party);
    setProgress(data.progress);
    setNames(data.party.guests.map((g: Guest) => g.name).join("\n"));
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!party?.booking.locationId) return;
    fetch(`/api/menu?locationId=${party.booking.locationId}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
  }, [party?.booking.locationId]);

  const selected = party?.guests.find((g: Guest) => g.id === guestId);
  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of products) {
      const list = map.get(product.category) || [];
      list.push(product);
      map.set(product.category, list);
    }
    return [...map.entries()];
  }, [products]);

  async function saveGuests() {
    await fetch(`/api/party/${code}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: names.split("\n") }),
    });
    setMessage("Guest list saved.");
    load();
  }

  async function confirmOrder(payNow: boolean) {
    const res = await fetch(`/api/party/${code}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, items: basket, payNow }),
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || "Could not save.");
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    setMessage("Choices confirmed.");
    setBasket([]);
    load();
  }

  async function hostPay() {
    const res = await fetch(`/api/party/${code}/pay`, { method: "POST" });
    const data = await res.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    setMessage(data.error || `Host paid ${formatMoney(data.amountPence || 0)}.`);
    load();
  }

  if (!party) return <div className="px-5 py-32 text-center text-mute">Loading party…</div>;

  const partyUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="site-page">
      <div className="site-page-inner">
        <p className="display text-[0.72rem] tracking-[0.28em] text-ember">Double Zero Party</p>
        <h1 className="serif mt-3 text-4xl md:text-5xl">
          {formatBookingDate(party.booking.date)} · {party.booking.time}
        </h1>
        <p className="mt-3 text-mute">
          {party.booking.guests} guests · Booked by {party.booking.name}
        </p>
        {party.deadlineAt ? (
          <p className="mt-2 text-sm">Pre-order closes {new Date(party.deadlineAt).toLocaleString("en-GB")}.</p>
        ) : null}
        <p className="mt-6 serif text-3xl">
          {progress.completed} / {progress.total} completed
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => setIsHost((v) => !v)}>
            {isHost ? "Guest view" : "I’m the host"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(partyUrl)}>
            Copy party link
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              navigator.share?.({ text: progress.reminderText, url: partyUrl }).catch(() => navigator.clipboard.writeText(progress.reminderText))
            }
          >
            Send reminder
          </button>
        </div>

        {isHost ? (
          <div className="form-panel mt-10">
            <p className="display text-[0.7rem] tracking-[0.2em] text-ember">Guest list</p>
            <textarea className="mt-4" value={names} onChange={(e) => setNames(e.target.value)} placeholder={"One name per line"} />
            <button type="button" className="btn btn-ember mt-4" onClick={saveGuests}>
              Save guests
            </button>
            {party.paymentMode === "HOST" ? (
              <button type="button" className="btn btn-ghost ml-3 mt-4" onClick={() => setPayOpen("host")}>
                Host pays balance
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <p className="display text-[0.7rem] tracking-[0.2em] text-mute">Select your name</p>
            <div className="mt-4 space-y-2">
              {party.guests.map((guest: Guest) => (
                <button
                  key={guest.id}
                  type="button"
                  className="slot w-full text-left"
                  aria-pressed={guestId === guest.id}
                  onClick={() => {
                    setGuestId(guest.id);
                    setBasket(guest.items.map((i) => ({ productId: i.productId || "", name: i.name, quantity: i.quantity, unitPence: i.unitPence })));
                  }}
                >
                  {guest.ordered ? "✓" : "○"} {guest.name}
                  {guest.ordered ? ` · ${formatMoney(guest.totalPence)}` : ""}
                </button>
              ))}
            </div>
          </div>
          <div>
            {selected ? (
              <>
                <p className="display text-[0.7rem] tracking-[0.2em] text-ember">{selected.name}’s order</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {basket.map((item, i) => (
                    <li key={`${item.name}-${i}`}>
                      {item.quantity} × {item.name} — {formatMoney(item.unitPence * item.quantity)}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm">
                  Total {formatMoney(basket.reduce((s, i) => s + i.unitPence * i.quantity, 0))}
                </p>
                <button
                  type="button"
                  className="btn btn-ember mt-4"
                  onClick={() => {
                    if (party.paymentMode !== "HOST") setPayOpen("guest");
                    else confirmOrder(false);
                  }}
                >
                  {party.paymentMode !== "HOST" ? "Pay and confirm" : "Confirm my choices"}
                </button>
              </>
            ) : (
              <p className="text-sm text-mute">Pick your name, then choose from the Double Zero menu.</p>
            )}
          </div>
        </div>

        {selected ? (
          <div className="mt-12 space-y-8">
            {grouped.map(([category, items]) => (
              <section key={category}>
                <h2 className="display text-[0.72rem] tracking-[0.2em] text-mute">{category}</h2>
                <div className="mt-3 divide-y divide-line">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p>{item.name}</p>
                        <p className="text-sm text-mute">{item.prices[0] ? formatMoney(item.prices[0].pricePence) : ""}</p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          const price = item.prices[0];
                          if (!price) return;
                          setBasket((cur) => [...cur, { productId: item.id, name: item.name, quantity: 1, unitPence: price.pricePence }]);
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {message ? <p className="mt-8 text-sm">{message}</p> : null}
        <PaySheet
          open={Boolean(payOpen)}
          amountPence={
            payOpen === "host"
              ? party.guests.reduce((sum: number, guest: Guest) => sum + (guest.paid ? 0 : guest.totalPence), 0)
              : basket.reduce((sum, item) => sum + item.unitPence * item.quantity, 0)
          }
          title={payOpen === "host" ? "Host pays the table" : "Pay for your food"}
          details={(() => {
            const loc = locations[party.booking.locationId as LocationId];
            const guest = party.guests.find((row: Guest) => row.id === guestId);
            return [
              { label: "Name", value: payOpen === "host" ? party.booking.name || "Host" : guest?.name || "" },
              { label: "Order", value: payOpen === "host" ? "Party table" : "Party food" },
              { label: "Restaurant", value: loc ? `${loc.shortName} · ${loc.address}, ${loc.postcode}` : "" },
              { label: "When", value: `${formatBookingDate(party.booking.date)} · ${party.booking.time}` },
            ];
          })()}
          locationId={party.booking.locationId as LocationId}
          onClose={() => setPayOpen(null)}
          onPaid={() => {
            const next = payOpen;
            setPayOpen(null);
            if (next === "host") hostPay();
            else confirmOrder(true);
          }}
        />
      </div>
    </div>
  );
}
