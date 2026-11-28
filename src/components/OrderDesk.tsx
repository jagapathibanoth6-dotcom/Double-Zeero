"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { locations, type LocationId } from "@/data/site";
import { extraToppings, extrasPence, includedToppings, parsePizzaNotes, pizzaNotes, toppingGroups } from "@/data/pizza-options";
import { formatBookingDate, todayISO } from "@/lib/booking";
import { formatMoney } from "@/lib/platform/money";
import { PaySheet } from "@/components/PaySheet";
import { startStripeCheckout } from "@/lib/platform/stripe-client";
import {
  type Product,
  isAvailable,
  type BasketItem,
  newLineId,
  pizzaLineCopy,
  canCustomise,
  categoryTitle,
  categoryOrder,
  productPhoto,
} from "@/components/order/order-desk-helpers";

export type OrderDeskSeed = {
  locationId: LocationId;
  date: string;
  products: Product[];
  dates: { date: string; label: string }[];
  slots: { time: string; available: boolean; used?: number; cap?: number }[];
  when: {
    openLabel: string;
    hours: { open: string; close: string } | null;
    asap: { ok: boolean; reason: string; etaMinutes: number };
  };
  via?: string;
};

/** Click & collect order form (the only kind of online order). */
export function OrderDesk({ seed }: { seed?: OrderDeskSeed }) {
  const router = useRouter();
  const [locationId, setLocationId] = useState<LocationId>(seed?.locationId || "manchester");
  const [date, setDate] = useState(seed?.date || todayISO());
  const [time, setTime] = useState("");
  const [asap, setAsap] = useState(false);
  const [slots, setSlots] = useState<{ time: string; available: boolean; used?: number; cap?: number }[]>(seed?.slots || []);
  const [openDates, setOpenDates] = useState<{ date: string; label: string }[]>(seed?.dates || []);
  const [when, setWhen] = useState<{
    openLabel: string;
    hours: { open: string; close: string } | null;
    asap: { ok: boolean; reason: string; etaMinutes: number };
  } | null>(seed?.when || null);
  const [products, setProducts] = useState<Product[]>(seed?.products || []);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [customise, setCustomise] = useState<Product | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [special, setSpecial] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { extras: string[]; removed: string[]; special: string }>>({});

  const kitchen = locations[locationId];

  useEffect(() => {
    let ignore = false;
    function loadMenu() {
      fetch(`/api/menu?locationId=${locationId}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (ignore) return;
          const next = (d.products || []) as Product[];
          setProducts(next);
          const off = new Set(next.filter((product) => !isAvailable(product)).map((product) => product.id));
          if (off.size) {
            setBasket((current) => current.filter((line) => !off.has(line.productId)));
            setCustomise((current) => (current && off.has(current.id) ? null : current));
          }
        });
    }
    fetch(`/api/pay/ready?locationId=${locationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setStripeReady(Boolean(data.ready));
      })
      .catch(() => {
        if (!ignore) setStripeReady(false);
      });
    loadMenu();
    const timer = window.setInterval(loadMenu, 5000);
    fetch(`/api/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId }),
    }).catch(() => undefined);
    setBasket([]);
    setCustomise(null);
    setEditingLineId(null);
    setDrafts({});
    setExtras([]);
    setRemoved([]);
    setSpecial("");
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [locationId]);

  useEffect(() => {
    const q = new URLSearchParams({ locationId, date, kind: "collect" });
    fetch(`/api/order/when?${q}`)
      .then((r) => r.json())
      .then((d) => {
        const dates = d.dates || [];
        setOpenDates(dates);
        setSlots(d.slots || []);
        setWhen({
          openLabel: d.openLabel || "Closed",
          hours: d.hours || null,
          asap: d.asap || { ok: false, reason: "Kitchen hours unavailable.", etaMinutes: 0 },
        });
        if (dates.length && !dates.some((row: { date: string }) => row.date === date)) {
          setDate(dates[0].date);
          setTime("");
          setAsap(false);
          return;
        }
        const openTimes = new Set(
          (d.slots || []).filter((slot: { available: boolean }) => slot.available).map((slot: { time: string }) => slot.time),
        );
        // Clear the chosen time if it is no longer offered.
        setTime((current) => (current && !openTimes.has(current) ? "" : current));
      });
  }, [locationId, date]);

  useEffect(() => {
    if (asap && when && !when.asap.ok) setAsap(false);
  }, [asap, when]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of products) {
      if (product.category === "TOPPINGS") continue;
      const list = map.get(product.category) || [];
      list.push(product);
      map.set(product.category, list);
    }
    return categoryOrder.filter((key) => map.has(key)).map((key) => [key, map.get(key)!] as const);
  }, [products]);

  const subtotal = basket.reduce((sum, item) => sum + item.unitPence * item.quantity, 0);
  const total = subtotal;

  function qtyFor(productId: string) {
    return basket.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);
  }

  function linesFor(productId: string) {
    return basket.filter((item) => item.productId === productId);
  }

  function pizzaFromOptions(product: Product, options?: { extras?: string[]; removed?: string[]; note?: string }): Omit<BasketItem, "lineId"> {
    const price = product.prices[0];
    const extraNames = options?.extras || [];
    const takenOff = options?.removed || [];
    const notes = pizzaNotes(extraNames, takenOff, options?.note || "");
    return {
      productId: product.id,
      name: price?.label ? `${product.name} (${price.label})` : product.name,
      quantity: 1,
      unitPence: (price?.pricePence || 0) + extrasPence(extraNames, takenOff),
      label: price?.label || "",
      notes,
    };
  }

  function add(product: Product, options?: { extras?: string[]; removed?: string[]; note?: string }) {
    if (!isAvailable(product) || !product.prices[0]) return;
    setBasket((current) => [...current, { lineId: newLineId(), ...pizzaFromOptions(product, options) }]);
  }

  function remove(product: Product) {
    setBasket((current) => {
      const found = [...current].reverse().find((item) => item.productId === product.id);
      if (!found) return current;
      if (found.quantity <= 1) return current.filter((item) => item !== found);
      return current.map((item) => (item === found ? { ...item, quantity: item.quantity - 1 } : item));
    });
  }

  function removeLine(lineId: string) {
    setBasket((current) => current.filter((item) => item.lineId !== lineId));
    if (editingLineId === lineId) closeCustomise();
  }

  function storeDraft(productId: string, next = { extras, removed, special }) {
    setDrafts((current) => ({ ...current, [productId]: next }));
  }

  function closeCustomise() {
    if (customise && !editingLineId) {
      setDrafts((current) => {
        const next = { ...current };
        delete next[customise.id];
        return next;
      });
    }
    setCustomise(null);
    setEditingLineId(null);
    setExtras([]);
    setRemoved([]);
    setSpecial("");
  }

  function openCustomise(product: Product) {
    if (!isAvailable(product)) return;
    if (customise?.id === product.id) {
      closeCustomise();
      return;
    }
    if (customise && !editingLineId) storeDraft(customise.id);
    const draft = drafts[product.id] || { extras: [], removed: [], special: "" };
    setEditingLineId(null);
    setCustomise(product);
    setExtras(draft.extras);
    setRemoved(draft.removed);
    setSpecial(draft.special);
  }

  function editLine(product: Product, line: BasketItem) {
    if (customise && !editingLineId) storeDraft(customise.id);
    const saved = parsePizzaNotes(line.notes || "");
    setCustomise(product);
    setEditingLineId(line.lineId);
    setExtras(saved.extras);
    setRemoved(saved.removed);
    setSpecial(saved.special);
  }

  function toppingOnPizza(product: Product) {
    return [...includedToppings(product.description).filter((name) => !removed.includes(name)), ...extras];
  }

  function takeOffPizza(name: string, product: Product) {
    if (extras.includes(name)) {
      setExtras(extras.filter((item) => item !== name));
      return;
    }
    if (includedToppings(product.description).includes(name) && !removed.includes(name)) {
      setRemoved([...removed, name]);
    }
  }

  function putOnPizza(name: string, charge = false) {
    if (!charge && removed.includes(name)) {
      setRemoved(removed.filter((item) => item !== name));
      return;
    }
    if (removed.includes(name)) {
      setRemoved(removed.filter((item) => item !== name));
    }
    if (!extras.includes(name)) setExtras([...extras, name]);
  }

  function confirmCustomise() {
    if (!customise) return;
    const next = pizzaFromOptions(customise, { extras, removed, note: special });
    if (editingLineId) {
      setBasket((current) => current.map((item) => (item.lineId === editingLineId ? { ...item, ...next } : item)));
    } else {
      setBasket((current) => [...current, { lineId: newLineId(), ...next }]);
      setDrafts((current) => {
        const copy = { ...current };
        delete copy[customise.id];
        return copy;
      });
    }
    setCustomise(null);
    setEditingLineId(null);
    setExtras([]);
    setRemoved([]);
    setSpecial("");
  }

  function startPay() {
    setError("");
    const fail = (message: string) => {
      setError(message);
      document.querySelector(".order-pay")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (!basket.length) return fail("Add something from the menu.");
    if (!name || !email) return fail("Add your name and email in the order card first.");
    const firstSlot = slots.find((slot) => slot.available)?.time || "";
    const useAsap = asap || (!time && Boolean(when?.asap.ok));
    const useTime = useAsap ? "" : time || firstSlot;
    if (!useAsap && !useTime) {
      return fail("Choose a collection time or ASAP.");
    }
    if (useAsap && when && !when.asap.ok) return fail(when.asap.reason);
    if (!total) return fail("Basket total is empty.");
    if (useAsap && !asap) setAsap(true);
    if (useTime && useTime !== time) setTime(useTime);
    if (stripeReady) {
      checkout(true, useAsap, useTime);
      return;
    }
    setPayOpen(true);
  }

  async function checkout(useStripe = false, useAsap = asap, useTime = time) {
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          source: "CLICK_COLLECT",
          items: basket,
          name,
          email,
          phone,
          notes,
          date,
          time: useTime,
          asap: useAsap,
          offerId: "offer-collect",
          via: seed?.via || "",
          chargeNow: !useStripe,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSending(false);
        return setError(data.error || "Could not place order.");
      }
      if (useStripe) {
        await startStripeCheckout({
          locationId,
          orderId: data.order.id,
          cancelPath: `/order/confirmed?ref=${data.order.ref}`,
        });
        return;
      }
      setSending(false);
      sessionStorage.setItem("dz-order", JSON.stringify({ ...data.order, access: data.access, mail: data.mail }));
      router.push(`/order/confirmed?ref=${data.order.ref}`);
    } catch (error) {
      setSending(false);
      setError(error instanceof Error ? error.message : "Could not start payment.");
    }
  }

  return (
    <div className={basket.length ? "order-wrap has-pay" : "order-wrap"}>
    <div className="order-desk">
      <div>
        <p className="display text-[0.72rem] tracking-[0.2em] text-mute">Restaurant</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {(Object.keys(locations) as LocationId[]).map((id) => {
            const loc = locations[id];
            const selected = locationId === id;
            return (
              <button
                key={id}
                type="button"
                className="site-card branch-choice"
                aria-pressed={selected}
                onClick={() => setLocationId(id)}
              >
                <span className="flex items-center gap-2">
                  <span className="serif text-xl leading-tight">{loc.shortName}</span>
                  {selected ? <span className="branch-choice-tick">Selected</span> : null}
                </span>
                <span className="branch-choice-meta text-sm leading-snug text-mute">
                  {loc.address}, {loc.city}, {loc.postcode}
                </span>
                <span className="branch-choice-meta text-xs text-mute">{loc.phone}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-mute">
          {`Collect from ${kitchen.address}, ${kitchen.city}, ${kitchen.postcode}.`}
          {when ? ` ${when.openLabel}.` : ""}
        </p>

        <div className="mt-8">
          <p className="display text-[0.72rem] tracking-[0.2em] text-ember">
            Collection time
          </p>
          <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor="date">Date</label>
            <select
              id="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTime("");
                setAsap(false);
              }}
            >
              {!openDates.length ? <option value={date}>No open days</option> : null}
              {openDates.map((row) => (
                <option key={row.date} value={row.date}>
                  {row.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="order-time">Time</label>
            <select
              id="order-time"
              value={asap ? "" : time}
              disabled={asap || !slots.length}
              onChange={(e) => {
                setAsap(false);
                setTime(e.target.value);
              }}
            >
              <option value="">{slots.length ? "Choose a time" : "Closed or no times left"}</option>
              {slots.map((slot) => (
                <option key={slot.time} value={slot.time} disabled={!slot.available}>
                  {slot.time}
                  {!slot.available ? " — full" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="slot slot-asap"
            aria-pressed={asap}
            disabled={!when?.asap.ok}
            title={when?.asap.reason}
            onClick={() => {
              if (!when?.asap.ok) return;
              setAsap((current) => !current);
              setTime("");
            }}
          >
            {asap ? "✓ ASAP" : "ASAP"}
          </button>
          </div>
          <p className="mt-3 text-sm text-mute">
            {asap && when?.asap.ok
              ? `About ${when.asap.etaMinutes} minutes if ${kitchen.shortName} can take it.`
              : when?.asap.reason || "Times follow this restaurant’s opening hours."}
          </p>
        </div>

        <div className="mt-12 space-y-5">
          {grouped.map(([category, items]) => {
            const selected = items.reduce((sum, item) => sum + qtyFor(item.id), 0);
            return (
              <section key={category} className="site-card order-section">
                <div className="order-section-head">
                  <div>
                    <p className="order-section-kicker">{items.length} dishes</p>
                    <h2 className="order-section-title">{categoryTitle[category] || category}</h2>
                  </div>
                  <span className="order-section-count">{selected ? `${selected} selected` : "None selected"}</span>
                </div>
                <ul>
                  {items.map((item) => {
                    const photo = productPhoto(item);
                    const count = qtyFor(item.id);
                    const pizzaLines = linesFor(item.id);
                    const open = customise?.id === item.id;
                    const included = includedToppings(item.description);
                    const onPizza = open ? toppingOnPizza(item) : included;
                    const takenOff = open ? included.filter((name) => removed.includes(name)) : [];
                    return (
                      <li key={item.id} className={`order-item ${count ? "is-picked" : ""} ${isAvailable(item) ? "" : "is-unavailable"}`}>
                        <div className="order-row">
                          <button type="button" className="order-row-main" disabled={!isAvailable(item)} onClick={() => (canCustomise(item) ? openCustomise(item) : add(item))}>
                            {photo ? (
                              <div className="order-row-photo">
                                { }
                                <img src={photo} alt="" />
                              </div>
                            ) : null}
                            <div className="order-row-copy">
                              <div className="order-row-top">
                                <p className="order-row-name">{item.name}</p>
                                <p className="order-row-price">
                                  {!isAvailable(item)
                                    ? "Unavailable"
                                    : item.prices[0]
                                      ? formatMoney((item.prices[0].pricePence || 0) + (open ? extrasPence(extras, removed) : 0))
                                      : ""}
                                </p>
                              </div>
                              <p className="text-sm leading-relaxed text-mute">{item.description}</p>
                            </div>
                          </button>
                          <div className="order-row-side">
                            {!isAvailable(item) ? <span className="menu-unavailable">Unavailable</span> : null}
                            {isAvailable(item) && count && !canCustomise(item) ? (
                              <div className="order-qty">
                                <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => remove(item)}>
                                  −
                                </button>
                                <span className="order-qty-label">{count} selected</span>
                                <button type="button" aria-label={`Add another ${item.name}`} onClick={() => add(item)}>
                                  +
                                </button>
                              </div>
                            ) : null}
                            {isAvailable(item) && (canCustomise(item) || !count || open) ? (
                              <button
                                type="button"
                                className="order-add"
                                onClick={() => (open ? confirmCustomise() : canCustomise(item) ? openCustomise(item) : add(item))}
                              >
                                {open && editingLineId ? "Save" : "Add"}
                              </button>
                            ) : null}
                            {open ? (
                              <button type="button" className="order-close" onClick={closeCustomise}>
                                Close
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {canCustomise(item) && pizzaLines.length ? (
                          <ul className="pizza-lines">
                            {pizzaLines.map((line, index) => (
                              <li key={line.lineId} className={`pizza-line ${editingLineId === line.lineId ? "is-editing" : ""}`}>
                                <div className="pizza-line-copy">
                                  <p className="pizza-line-name">
                                    {item.name}
                                    {pizzaLines.length > 1 ? ` · ${index + 1}` : ""}
                                  </p>
                                  <p className="pizza-line-meta">{pizzaLineCopy(item, line.notes)}</p>
                                  <p className="pizza-line-price">{formatMoney(line.unitPence * line.quantity)}</p>
                                </div>
                                <div className="pizza-line-actions">
                                  <button type="button" onClick={() => editLine(item, line)}>
                                    Edit
                                  </button>
                                  <button type="button" className="is-delete" onClick={() => removeLine(line.lineId)}>
                                    Delete
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {open ? (
                          <div className="pizza-expand">
                            <div className="pizza-options-block">
                              <p className="pizza-options-label">On this pizza</p>
                              <div className="pizza-options-grid">
                                {onPizza.map((topping) => {
                                  const extra = extraToppings.find((row) => row.name === topping);
                                  return (
                                    <button
                                      key={topping}
                                      type="button"
                                      className="pizza-chip is-in"
                                      onClick={() => takeOffPizza(topping, item)}
                                    >
                                      {topping}
                                      {extra && extras.includes(topping) ? ` · ${formatMoney(extra.pence)}` : ""}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            {takenOff.length ? (
                              <div className="pizza-options-block">
                                <p className="pizza-options-label">Taken off</p>
                                <div className="pizza-options-grid">
                                  {takenOff.map((topping) => (
                                    <button key={topping} type="button" className="pizza-chip is-off" onClick={() => putOnPizza(topping)}>
                                      {topping}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {toppingGroups.map((group) => {
                              const extrasHere = extraToppings.filter((topping) => {
                                if (topping.group !== group) return false;
                                if (extras.includes(topping.name)) return false;
                                if (included.includes(topping.name) && !removed.includes(topping.name)) return false;
                                return true;
                              });
                              if (!extrasHere.length) return null;
                              return (
                                <div key={group} className="pizza-options-block">
                                  <p className="pizza-options-label">{group}</p>
                                  <div className="pizza-options-grid">
                                    {extrasHere.map((topping) => (
                                      <button
                                        key={topping.name}
                                        type="button"
                                        className="pizza-chip"
                                        onClick={() => putOnPizza(topping.name, true)}
                                      >
                                        {topping.name}
                                        {topping.pence ? ` · ${formatMoney(topping.pence)}` : ""}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}

                            <div className="pizza-options-block">
                              <label className="pizza-options-label" htmlFor={`pizza-note-${item.id}`}>
                                Special note
                              </label>
                              <textarea
                                id={`pizza-note-${item.id}`}
                                value={special}
                                onChange={(e) => setSpecial(e.target.value)}
                                placeholder="Well done, extra hot, cut in squares…"
                              />
                            </div>

                            <p className="mt-4 text-sm text-mute">
                              {formatMoney((item.prices[0]?.pricePence || 0) + extrasPence(extras, removed))} · tap {editingLineId ? "Save" : "Add"} on the right
                            </p>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <aside className={`form-panel order-pay${basket.length ? "" : " is-empty"}`}>
        <div className="order-pay-scroll">
          <p className="display text-[0.7rem] tracking-[0.2em] text-ember">
            Click & collect
          </p>
          <p className="mt-2 text-sm text-mute">
            {kitchen.address}, {kitchen.postcode}
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {basket.map((item) => (
              <li key={item.lineId} className="flex justify-between gap-3">
                <span>
                  {item.quantity} × {item.name}
                  {item.notes ? <em className="mt-1 block text-xs text-mute">{item.notes}</em> : null}
                </span>
                <span>{formatMoney(item.unitPence * item.quantity)}</span>
              </li>
            ))}
            {!basket.length ? <li className="text-mute">Nothing added yet.</li> : null}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Food</dt>
              <dd>{formatMoney(subtotal)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Total</dt>
              <dd>{formatMoney(total)}</dd>
            </div>
          </dl>
          <div className="mt-6 space-y-3">
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
        </div>
        <div className="order-pay-foot">
          <button type="button" className="btn btn-ember w-full" disabled={sending} onClick={startPay}>
            {sending ? (stripeReady ? "Opening Stripe…" : "Paying…") : `Pay ${formatMoney(total)}`}
          </button>
        </div>
        <PaySheet
          open={payOpen}
          amountPence={total}
          title="Pay for collection"
          details={[
            { label: "Name", value: name },
            { label: "Email", value: email },
            { label: "Order", value: "Click & collect" },
            { label: "Restaurant", value: `${kitchen.shortName} · ${kitchen.address}, ${kitchen.postcode}` },
            {
              label: "When",
              value: asap ? `ASAP · about ${when?.asap.etaMinutes || 40} min` : `${formatBookingDate(date)}${time ? ` · ${time}` : ""}`,
            },
          ]}
          locationId={locationId}
          onClose={() => setPayOpen(false)}
          onPaid={(result) => {
            setPayOpen(false);
            checkout(result.method === "STRIPE");
          }}
        />
      </aside>
    </div>
      {basket.length ? (
        <div className="order-pay-dock">
          <div>
            <p className="display text-[0.62rem] tracking-[0.16em] text-ember">
              {basket.reduce((sum, item) => sum + item.quantity, 0)} selected
            </p>
            <p className="serif text-xl leading-none">{formatMoney(total)}</p>
            {error ? <p className="order-pay-dock-error">{error}</p> : null}
          </div>
          <button type="button" className="btn btn-ember" disabled={sending} onClick={startPay}>
            {sending ? (stripeReady ? "Opening Stripe…" : "Paying…") : "Pay"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
