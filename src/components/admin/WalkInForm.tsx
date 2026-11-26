"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WalkInForm({
  date,
  time,
  slots,
  tables,
  onClose,
}: {
  date: string;
  time: string;
  slots: string[];
  tables: { code: string; seats: number }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_walkin",
        date,
        time: form.get("time"),
        name: form.get("name") || "Walk-in",
        guests: Number(form.get("guests") || 2),
        tableCodes: form.get("tableCodes") || "",
        phone: form.get("phone") || "",
        email: form.get("email") || "",
        notes: form.get("notes") || "",
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Could not seat walk-in.");
      return;
    }
    window.dispatchEvent(new CustomEvent("dz-admin-toast", { detail: "Walk-in seated. Diary updated." }));
    window.dispatchEvent(new Event("dz-admin-refresh"));
    router.refresh();
    onClose();
  }

  return (
    <div className="walkin-sheet" role="dialog" aria-labelledby="walkin-title">
      <div className="walkin-sheet-head">
        <div>
          <p className="today-kicker">Diary</p>
          <h2 id="walkin-title">Seat a walk-in</h2>
        </div>
        <button type="button" className="diary-nav-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <form className="record-form" onSubmit={onSubmit}>
        <div className="walkin-grid">
          <label>
            Time
            <select name="time" defaultValue={time} required>
              {time && !slots.includes(time) ? <option value={time}>{time}</option> : null}
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
          <label>
            Guests
            <input name="guests" type="number" min={1} defaultValue={2} required />
          </label>
        </div>
        <label>
          Guest name
          <input name="name" defaultValue="Walk-in" required />
        </label>
        <label>
          Table
          <select name="tableCodes" defaultValue="">
            <option value="">Auto assign</option>
            {tables.map((table) => (
              <option key={table.code} value={table.code}>
                {table.code} · {table.seats} seats
              </option>
            ))}
          </select>
        </label>
        <div className="walkin-grid">
          <label>
            Phone
            <input name="phone" inputMode="tel" />
          </label>
          <label>
            Email
            <input name="email" type="email" />
          </label>
        </div>
        <label>
          Notes
          <textarea name="notes" rows={3} placeholder="Allergies, highchair, waiting at bar" />
        </label>
        <button className="btn btn-ember" type="submit" disabled={busy}>
          {busy ? "Seating…" : "Seat walk-in"}
        </button>
        {message ? <p className="record-note">{message}</p> : null}
      </form>
    </div>
  );
}
