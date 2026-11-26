"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerForm({
  id,
  name,
  email,
  phone,
}: {
  id: string;
  name: string;
  email: string;
  phone: string;
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
        action: "update_customer",
        id,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
      }),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(res.ok ? "Saved." : data.error || "Could not save.");
    router.refresh();
  }

  return (
    <form className="record-form" onSubmit={onSubmit}>
      <label>
        Name
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
      <button className="btn btn-ember" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Update details"}
      </button>
      {message ? <p className="record-note">{message}</p> : null}
    </form>
  );
}
