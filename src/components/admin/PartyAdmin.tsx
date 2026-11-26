"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartyAdmin({
  id,
  paymentMode,
  deadlineAt,
}: {
  id: string;
  paymentMode: string;
  deadlineAt: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(paymentMode);
  const [deadline, setDeadline] = useState(deadlineAt);
  const [saved, setSaved] = useState("");

  async function save() {
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "party_update", id, paymentMode: mode, deadlineAt: deadline }),
    });
    setSaved(res.ok ? "Updated." : "Could not update.");
    router.refresh();
  }

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="INDIVIDUAL">Guests pay themselves</option>
        <option value="HOST">Host pays</option>
      </select>
      <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      <button type="button" className="btn btn-ghost" onClick={save}>
        Save party
      </button>
      {saved ? <p className="text-sm">{saved}</p> : null}
    </div>
  );
}
