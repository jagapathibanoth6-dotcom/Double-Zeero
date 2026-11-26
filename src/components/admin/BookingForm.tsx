"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BookingEditForm({
  id,
  name,
  email,
  phone,
  notes,
  status,
  tableCodes,
}: {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: string;
  tableCodes: string;
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
        action: "update_booking",
        id,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        notes: form.get("notes"),
        status: form.get("status"),
        tableCodes: form.get("tableCodes"),
      }),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(res.ok ? "Saved." : data.error || "Could not save.");
    if (res.ok) {
      window.dispatchEvent(new CustomEvent("dz-admin-toast", { detail: form.get("status") === "CANCELLED" ? "Booking cancelled. Diary updated." : "Booking saved. Diary updated." }));
      window.dispatchEvent(new Event("dz-admin-refresh"));
    }
    router.refresh();
  }

  return (
    <form className="record-form" onSubmit={onSubmit}>
      <label>
        Guest name
        <input name="name" defaultValue={name} required />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={email} required />
      </label>
      <label>
        Phone
        <input name="phone" defaultValue={phone} />
      </label>
      <label>
        Tables
        <input name="tableCodes" defaultValue={tableCodes} placeholder="T3,T4" />
      </label>
      <label>
        Status
        <select name="status" defaultValue={status}>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING_DEPOSIT">Pending deposit</option>
          <option value="SEATED">Seated</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </label>
      <label>
        Notes
        <textarea name="notes" defaultValue={notes} rows={4} />
      </label>
      <button className="btn btn-ember" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Update booking"}
      </button>
      {message ? <p className="record-note">{message}</p> : null}
    </form>
  );
}
