"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function confirmCopy(action: string, label: string, body?: Record<string, unknown>) {
  const status = String(body?.status || "");
  if (action === "order_status") {
    if (status === "ACCEPTED" || label === "Accept") return "Accept this order and send it to the kitchen?";
    if (status === "PREPARING" || label === "Kitchen") return "Move this order into the kitchen?";
    if (status === "READY" || label === "Ready") return "Mark this order ready?";
    if (status === "DISPATCHED" || label === "Dispatched" || label === "On the way") return "Mark this order as on the way?";
    if (status === "COMPLETED" && label === "Picked up") return "Mark this order as picked up?";
    if (status === "COMPLETED" && label === "Delivered") return "Mark this order as delivered?";
    if (status === "COMPLETED" || label === "Done") return "Mark this order done?";
    if (status === "CANCELLED" || label === "Cancel") return "Cancel this order? Any paid amount will be refunded.";
    if (label === "Next") return "Move this ticket to the next stage?";
  }
  if (action === "refund") return "Issue this refund to the same payment method?";
  if (action === "set_paid") return body?.paid ? "Mark this as paid?" : "Mark this as unpaid?";
  if (action === "party_cancel") return "Cancel this party booking and refund the deposit?";
  if (action === "cancel_booking") return "Cancel this booking? Any paid amount will be refunded.";
  if (action === "delete_booking") return "Delete this walk-in from the diary? This cannot be undone.";
  if (action === "delete_order") return "Delete this ticket from the kitchen? Any paid amount will be refunded. This cannot be undone.";
  if (action === "decline_enquiry") return "Decline this enquiry?";
  if (action === "waitlist_book") return "Book this waitlist guest now?";
  return `Confirm ${label}?`;
}

function doneCopy(action: string, label: string, body?: Record<string, unknown>) {
  const status = String(body?.status || "");
  if (action === "order_status") {
    if (status === "ACCEPTED" || label === "Accept") return "Order accepted. Kitchen updated.";
    if (status === "PREPARING" || label === "Kitchen") return "Order is in the kitchen.";
    if (status === "READY" || label === "Ready") return "Order marked ready.";
    if (status === "DISPATCHED" || label === "Dispatched" || label === "On the way") return "Order is on the way.";
    if (status === "COMPLETED" && label === "Picked up") return "Marked picked up.";
    if (status === "COMPLETED" && label === "Delivered") return "Marked delivered.";
    if (status === "COMPLETED" || label === "Done") return "Order marked done.";
    if (status === "CANCELLED" || label === "Cancel") return "Order cancelled. Refund issued if anything was paid.";
    if (label === "Next") return "Ticket moved on. Board updated.";
  }
  if (action === "refund") return "Refund issued.";
  if (action === "set_paid") return body?.paid ? "Marked paid." : "Marked unpaid.";
  if (action === "cancel_booking") return "Booking cancelled. Diary updated.";
  if (action === "delete_booking") return "Walk-in deleted. Diary updated.";
  if (action === "delete_order") return "Ticket deleted. Kitchen updated.";
  return `${label} done.`;
}

export function ActionButton({
  action,
  body,
  label,
  confirm = true,
  next,
}: {
  action: string;
  body?: Record<string, unknown>;
  label: string;
  confirm?: boolean;
  next?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "That did not work.");
        setAsking(false);
        return;
      }
      setAsking(false);
      window.dispatchEvent(new CustomEvent("dz-admin-toast", { detail: doneCopy(action, label, body) }));
      window.dispatchEvent(new Event("dz-admin-refresh"));
      if (next) router.push(next);
      else router.refresh();
    } catch {
      setError("That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="action-btn">
      {asking ? (
        <span className="action-confirm">
          <p>{confirmCopy(action, label, body)}</p>
          <span className="action-confirm-row">
            <button type="button" className="btn btn-ember" disabled={busy} onClick={run}>
              {busy ? "Updating…" : "Confirm"}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setAsking(false)}>
              Back
            </button>
          </span>
        </span>
      ) : (
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => (confirm ? setAsking(true) : run())}>
          {busy ? "…" : label}
        </button>
      )}
      {error ? <span className="action-error">{error}</span> : null}
    </span>
  );
}
