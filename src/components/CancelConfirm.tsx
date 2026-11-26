"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefundStatement } from "@/components/RefundStatement";
import type { RefundQuote } from "@/lib/platform/pay";

export function CancelConfirm({
  kind,
  id,
  code,
  backHref,
}: {
  kind: "order" | "booking";
  id?: string;
  code?: string;
  backHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<RefundQuote | null>(null);

  async function confirm() {
    setBusy(true);
    setError("");
    const path = code ? (kind === "order" ? "/api/order/cancel" : "/api/book/cancel") : "/api/account";
    const body = code
      ? { ref: code }
      : kind === "order"
        ? { action: "cancel_order", orderId: id }
        : { action: "cancel_booking", bookingId: id };
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not cancel.");
      return;
    }
    if (data.quote) {
      setDone(data.quote);
      router.refresh();
      return;
    }
    router.push(backHref);
    router.refresh();
  }

  if (done) {
    return (
      <div>
        <RefundStatement quote={done} done />
        <div className="mt-8">
          <a href={backHref} className="btn btn-ember">
            Back
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button type="button" className="btn btn-ember" disabled={busy} onClick={confirm}>
        {busy ? "Cancelling…" : kind === "order" ? "Confirm cancel order" : "Confirm cancel booking"}
      </button>
      <a href={backHref} className="btn btn-ghost">
        Keep it
      </a>
      {error ? <p className="w-full text-sm text-ember">{error}</p> : null}
    </div>
  );
}
