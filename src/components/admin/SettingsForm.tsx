"use client";

import { useState, type ReactNode } from "react";
import type { LocationSettings, Table } from "@prisma/client";
import { DAY_LABELS, defaultWeekHours, parseWeekHours, type WeekHours } from "@/lib/platform/hours";
import type { LocationId } from "@/data/site";
import { TableDesk } from "@/components/admin/TableDesk";

function pounds(pence: number) {
  return (Number(pence) / 100).toFixed(2);
}

function WeekEditor({
  title,
  note,
  value,
  onChange,
}: {
  title: string;
  note: string;
  value: WeekHours;
  onChange: (next: WeekHours) => void;
}) {
  return (
    <div className="settings-hours-card">
      <div className="today-panel-head">
        <div>
          <h3>{title}</h3>
          <p>{note}</p>
        </div>
      </div>
      <div className="settings-hours-table">
        <div className="settings-hours-row is-head">
          <span>Day</span>
          <span>Opens</span>
          <span>Closes</span>
          <span>Open</span>
        </div>
        {DAY_LABELS.map((label, day) => {
          const hours = value[day as 0 | 1 | 2 | 3 | 4 | 5 | 6];
          return (
            <div key={label} className={`settings-hours-row ${hours ? "" : "is-shut"}`}>
              <span>{label}</span>
              <input
                type="time"
                value={hours?.open || ""}
                disabled={!hours}
                onChange={(e) => onChange({ ...value, [day]: hours ? { ...hours, open: e.target.value } : null })}
              />
              <input
                type="time"
                value={hours?.close || ""}
                disabled={!hours}
                onChange={(e) => onChange({ ...value, [day]: hours ? { ...hours, close: e.target.value } : null })}
              />
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(hours)}
                  onChange={(e) => onChange({ ...value, [day]: e.target.checked ? { open: "12:00", close: "22:00" } : null })}
                />
                {hours ? "Open" : "Shut"}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
      {hint ? <em>{hint}</em> : null}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className={`settings-toggle ${checked ? "is-on" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{label}</strong>
        <em>{hint}</em>
      </span>
    </label>
  );
}

type HouseSettings = LocationSettings & {
  stripeKeyHint?: string;
  stripeReady?: boolean;
  stripePublishableKey?: string;
};

export function SettingsForm({
  settings,
  tables = [],
  occupied = [],
}: {
  settings: HouseSettings;
  tables?: Table[];
  occupied?: string[];
}) {
  const locationId = settings.locationId as LocationId;
  const [form, setForm] = useState(settings);
  const [hours, setHours] = useState(parseWeekHours(settings.hoursJson, defaultWeekHours(locationId, "table")));
  const [collect, setCollect] = useState(parseWeekHours(settings.collectionHoursJson, defaultWeekHours(locationId, "collection")));
  const [stripeKey, setStripeKey] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof LocationSettings>(key: K, value: LocationSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_settings",
        ...form,
        hoursJson: JSON.stringify(hours),
        collectionHoursJson: JSON.stringify(collect),
        stripeSecretKey: stripeKey,
        stripePublishableKey,
      }),
    });
    setBusy(false);
    setSaved(res.ok ? "Saved for this restaurant." : "Could not save.");
  }

  return (
    <form onSubmit={onSubmit} className="settings-form">
      <div className="settings-grid">
        <section className="admin-panel">
          <div className="today-panel-head">
            <div>
              <h2>Bookings</h2>
              <p>How many guests can book online, and when the diary asks the restaurant.</p>
            </div>
          </div>
          <label className="settings-inline">
            <span>Max sitting</span>
            <input type="number" min={1} value={form.sittingCapacity || 40} onChange={(e) => set("sittingCapacity", Number(e.target.value))} />
          </label>
          <TableDesk tables={tables} occupied={occupied} />
          <div className="settings-fields">
            <Field label="Max guests online" hint="Largest party the website will take.">
              <input type="number" min={1} value={form.maxOnlineGuests} onChange={(e) => set("maxOnlineGuests", Number(e.target.value))} />
            </Field>
            <Field label="Large booking from" hint="Shown as a large table from this size.">
              <input type="number" min={1} value={form.largeFrom} onChange={(e) => set("largeFrom", Number(e.target.value))} />
            </Field>
            <Field label="Auto-confirm up to" hint="Larger parties wait for the restaurant.">
              <input type="number" min={1} value={form.maxAutoBooking} onChange={(e) => set("maxAutoBooking", Number(e.target.value))} />
            </Field>
            <Field label="Enquiry from" hint="These become a phone / email enquiry.">
              <input type="number" min={1} value={form.enquiryFrom} onChange={(e) => set("enquiryFrom", Number(e.target.value))} />
            </Field>
            <Field label="Table turnaround" hint="Minutes to reset a table after a sitting.">
              <input type="number" min={0} step={5} value={form.turnaroundMinutes} onChange={(e) => set("turnaroundMinutes", Number(e.target.value))} />
            </Field>
          </div>
        </section>

        <section className="admin-panel">
          <div className="today-panel-head">
            <div>
              <h2>Deposits</h2>
              <p>Taken on larger tables so the booking is held.</p>
            </div>
          </div>
          <Toggle
            label="Take deposits"
            hint="Charge a deposit when the party is large enough."
            checked={form.depositEnabled}
            onChange={(next) => set("depositEnabled", next)}
          />
          <div className="settings-fields">
            <Field label="Deposit type">
              <select value={form.depositType} onChange={(e) => set("depositType", e.target.value)}>
                <option value="FIXED">Fixed amount</option>
                <option value="PER_PERSON">Per person</option>
              </select>
            </Field>
            <Field label="Amount" hint={form.depositType === "PER_PERSON" ? "Pounds per guest." : "Pounds per booking."}>
              <input
                type="number"
                min={0}
                step="0.50"
                value={pounds(form.depositAmountPence)}
                onChange={(e) => set("depositAmountPence", Math.round(Number(e.target.value) * 100))}
              />
            </Field>
            <Field label="From guests" hint="Deposit starts at this party size.">
              <input type="number" min={1} value={form.depositFrom} onChange={(e) => set("depositFrom", Number(e.target.value))} />
            </Field>
          </div>
        </section>

        <section className="admin-panel">
          <div className="today-panel-head">
            <div>
              <h2>Pre-order & waitlist</h2>
              <p>Food in advance for bigger tables, and a list when you are full.</p>
            </div>
          </div>
          <Toggle
            label="Pre-order"
            hint="Ask larger parties to choose food before they arrive."
            checked={form.preorderEnabled}
            onChange={(next) => set("preorderEnabled", next)}
          />
          <Toggle
            label="Waiting list"
            hint="Let guests join a list when no table is free."
            checked={form.waitlistEnabled}
            onChange={(next) => set("waitlistEnabled", next)}
          />
          <div className="settings-fields">
            <Field label="Pre-order from" hint="Required from this party size.">
              <input type="number" min={1} value={form.preorderFrom} onChange={(e) => set("preorderFrom", Number(e.target.value))} />
            </Field>
            <Field label="Deadline" hint="Hours before the sitting.">
              <input type="number" min={1} value={form.preorderDeadlineHours} onChange={(e) => set("preorderDeadlineHours", Number(e.target.value))} />
            </Field>
          </div>
        </section>

        <section className="admin-panel">
          <div className="today-panel-head">
            <div>
              <h2>Click & collect</h2>
              <p>Collection slots and reminders for this restaurant.</p>
            </div>
          </div>
          <div className="settings-fields">
            <Field label="Collections per slot" hint="Max click & collect orders every 15 minutes.">
              <input type="number" min={1} value={form.collectionMaxPerSlot} onChange={(e) => set("collectionMaxPerSlot", Number(e.target.value))} />
            </Field>
            <Field label="Collect reminder" hint="Minutes before pickup. Orders pings the board.">
              <input
                type="number"
                min={1}
                value={form.collectionRemindMinutes || 15}
                onChange={(e) => set("collectionRemindMinutes", Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="settings-uber">
            <p className="settings-uber-title">Stripe</p>
            <p className="settings-uber-copy">
              {settings.stripeReady
                ? "Ready. Card, Apple Pay and Google Pay take real payments. Paste a new key only to replace it."
                : settings.stripeKeyHint
                  ? "Key saved. Confirm it starts with sk_test_ or sk_live_ if payments fail."
                  : "Paste the Stripe secret API key. After save, checkout uses card, Apple Pay and Google Pay."}
            </p>
            <div className="settings-fields">
              <Field label="API key" hint={settings.stripeKeyHint ? `Saved ${settings.stripeKeyHint}` : "Paste sk_test_… or sk_live_… from Stripe."}>
                <input
                  type="password"
                  autoComplete="off"
                  value={stripeKey}
                  placeholder={settings.stripeKeyHint ? "Paste to replace" : "sk_live_… or sk_test_…"}
                  onChange={(e) => setStripeKey(e.target.value)}
                />
              </Field>
              <Field label="Publishable key" hint={settings.stripePublishableKey ? "Optional. Saved. Paste to replace." : "Optional. pk_test_… or pk_live_…"}>
                <input
                  type="password"
                  autoComplete="off"
                  value={stripePublishableKey}
                  placeholder="pk_live_… or pk_test_…"
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-panel settings-hours-panel">
        <div className="today-panel-head">
          <div>
            <h2>Hours</h2>
            <p>Table sittings and collection windows for each day of the week.</p>
          </div>
        </div>
        <div className="settings-hours-grid">
          <WeekEditor title="Tables" note="When the diary is open for bookings." value={hours} onChange={setHours} />
          <WeekEditor title="Click & collect" note="When guests can collect an order." value={collect} onChange={setCollect} />
        </div>
      </section>

      <div className="settings-save">
        <button className="btn btn-ember" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
        {saved ? <p className="record-note">{saved}</p> : null}
      </div>
    </form>
  );
}
