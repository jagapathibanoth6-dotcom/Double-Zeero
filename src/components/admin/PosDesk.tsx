"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/platform/money";
import { ActionButton } from "@/components/admin/ActionButton";
import { PayBadge } from "@/components/admin/PayBadge";
import { RefundControls } from "@/components/admin/RefundControls";
import type { PaymentRow } from "@/lib/platform/pay";

type MenuRow = {
  id: string;
  name: string;
  category: string;
  available?: boolean;
  prices: { id: string; label: string; pricePence: number; available?: boolean }[];
};

function posAvailable(item: MenuRow) {
  return item.available !== false && item.prices.some((price) => price.available !== false);
}

type Ticket = {
  id: string;
  ref: string;
  source: string;
  status: string;
  name: string;
  time: string;
  asap: boolean;
  totalPence: number;
  items: { id: string; name: string; quantity: number }[];
  payments: PaymentRow[];
  booking?: { ref: string; tableCodes: string } | null;
  guest?: { name: string } | null;
};

type Line = { productId: string; name: string; quantity: number; unitPence: number };

export function PosDesk({ menu, orders }: { menu: MenuRow[]; orders: Ticket[] }) {
  const router = useRouter();
  const [basket, setBasket] = useState<Line[]>([]);
  const [name, setName] = useState("Walk-in");
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const total = useMemo(() => basket.reduce((sum, line) => sum + line.unitPence * line.quantity, 0), [basket]);

  function add(product: MenuRow, price: MenuRow["prices"][number]) {
    if (!posAvailable(product) || price.available === false) return;
    const label = price.label ? `${product.name} ${price.label}` : product.name;
    setBasket((current) => {
      const match = current.find((line) => line.name === label && line.unitPence === price.pricePence);
      if (match) return current.map((line) => (line === match ? { ...line, quantity: line.quantity + 1 } : line));
      return [...current, { productId: product.id, name: label, quantity: 1, unitPence: price.pricePence }];
    });
  }

  async function send() {
    if (!basket.length) return;
    setBusy(true);
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_pos_order", items: basket, name, notes: note, paid, asap: true }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage(data.error || "Could not send to kitchen.");
    setBasket([]);
    setNote("");
    setMessage(`Ticket ${data.order?.ref || ""} sent.`);
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h2 className="serif text-2xl">New ticket</h2>
        <div className="mt-4 space-y-5">
          {["PIZZAS", "STARTERS", "SIDES", "DRINKS", "DESSERTS", "KIDS", "CALZONES"].map((cat) => {
            const rows = menu.filter((item) => item.category === cat);
            if (!rows.length) return null;
            return (
              <section key={cat}>
                <h3 className="display text-[0.7rem] tracking-[0.16em] text-mute">{cat}</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {rows.map((item) =>
                    item.prices.map((price) => (
                      <button
                        key={`${item.id}-${price.id}`}
                        type="button"
                        className={`border border-line bg-paper p-3 text-left ${posAvailable(item) && price.available !== false ? "" : "is-unavailable"}`}
                        disabled={!posAvailable(item) || price.available === false}
                        onClick={() => add(item, price)}
                      >
                        <strong>{item.name}</strong>
                        {price.label ? <span className="text-mute"> {price.label}</span> : null}
                        <span className="block text-sm">
                          {posAvailable(item) && price.available !== false ? formatMoney(price.pricePence) : "Unavailable"}
                        </span>
                      </button>
                    )),
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <aside className="space-y-6">
        <section className="border border-line bg-paper p-5">
          <h2 className="serif text-2xl">Basket</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {basket.map((line, index) => (
              <li key={`${line.name}-${index}`} className="flex justify-between gap-3">
                <span>
                  {line.quantity} × {line.name}
                </span>
                <button type="button" onClick={() => setBasket(basket.filter((_, i) => i !== index))}>
                  Remove
                </button>
              </li>
            ))}
            {!basket.length ? <li className="text-mute">Tap dishes to start a ticket.</li> : null}
          </ul>
          <p className="mt-3 font-medium">{formatMoney(total)}</p>
          <input className="mt-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" />
          <textarea className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes" />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            Paid at till
          </label>
          <button className="btn btn-ember mt-3" type="button" disabled={busy || !basket.length} onClick={send}>
            {busy ? "Sending…" : "Send to kitchen"}
          </button>
          {message ? <p className="mt-2 text-sm">{message}</p> : null}
        </section>

        <section>
          <h2 className="serif text-2xl">Open tickets</h2>
          <div className="mt-3 space-y-3">
            {orders.map((order) => (
              <article key={order.id} className="border border-line bg-paper p-4">
                <p className="display text-[0.68rem] tracking-[0.16em] text-ember">
                  #{order.ref} · {order.source}
                </p>
                <p className="mt-1 text-sm">
                  {order.booking ? `Booking ${order.booking.ref} · ${order.booking.tableCodes}` : order.name} <PayBadge payments={order.payments} />
                </p>
                <ul className="mt-2 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {order.guest ? `${order.guest.name}: ` : ""}
                      {item.quantity} × {item.name}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm">{formatMoney(order.totalPence)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton action="order_status" body={{ orderId: order.id, status: "ACCEPTED" }} label="Accept" />
                  <ActionButton action="order_status" body={{ orderId: order.id, status: "PREPARING" }} label="Kitchen" />
                  <ActionButton action="order_status" body={{ orderId: order.id, status: "READY" }} label="Ready" />
                  <ActionButton action="order_status" body={{ orderId: order.id, status: "COMPLETED" }} label="Done" />
                  <RefundControls payments={order.payments} orderId={order.id} compact />
                </div>
              </article>
            ))}
            {!orders.length ? <p className="text-mute">No open tickets.</p> : null}
          </div>
        </section>
      </aside>
    </div>
  );
}
