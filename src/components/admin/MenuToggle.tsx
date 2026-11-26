"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MenuToggle({
  productId,
  locationId,
  available,
}: {
  productId: string;
  locationId: string;
  available: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(available);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "product_available", productId, locationId, available: next }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button type="button" className={`menu-switch ${on ? "is-on" : ""}`} disabled={busy} onClick={toggle}>
      <span className="menu-switch-track" aria-hidden="true">
        <span className="menu-switch-knob" />
      </span>
      <span>{on ? "Available" : "Unavailable"}</span>
    </button>
  );
}
