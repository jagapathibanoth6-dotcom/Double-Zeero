"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/platform/money";
import { leftoverPence, type PaymentRow } from "@/lib/platform/pay";

const reasons = [
  { id: "requested_by_customer", label: "Guest asked" },
  { id: "duplicate", label: "Duplicate charge" },
  { id: "fraudulent", label: "Fraud" },
  { id: "other", label: "Other" },
] as const;

export function RefundControls({
  payments,
  orderId,
  bookingId,
  compact = false,
}: {
  payments?: PaymentRow[] | null;
  orderId?: string;
  bookingId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const left = (payments || []).reduce((sum, payment) => sum + leftoverPence(payment), 0);
  const ids = (payments || []).filter((payment) => leftoverPence(payment) > 0 && payment.id).map((payment) => payment.id as string);
  const stripe = (payments || []).some((payment) => payment.provider === "STRIPE" && leftoverPence(payment) > 0);
  const [pounds, setPounds] = useState("");
  const [reasonId, setReasonId] = useState<(typeof reasons)[number]["id"]>("requested_by_customer");
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState<"full" | "partial" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (left <= 0 || !ids.length) return null;

  const partialPence = Math.round(Number(pounds) * 100);
  const reason =
    reasonId === "other" ? note.trim() || "Other" : reasonId;

  async function send(kind: "full" | "partial") {
    setError("");
    if (kind === "partial") {
      if (!Number.isFinite(partialPence) || partialPence < 1) return setError("Enter how much to refund.");
      if (partialPence > left) return setError(`Only ${formatMoney(left)} can be refunded.`);
    }
    if (reasonId === "other" && !note.trim()) return setError("Add a short reason.");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund",
          orderId,
          bookingId,
          paymentIds: ids,
          amountPence: kind === "partial" ? partialPence : undefined,
          reason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not refund.");
        return;
      }
      setAsking(null);
      setPounds("");
      setNote("");
      window.dispatchEvent(
        new CustomEvent("dz-admin-toast", {
          detail: kind === "full" ? `Full refund ${formatMoney(left)} issued.` : `Partial refund ${formatMoney(partialPence)} issued.`,
        }),
      );
      window.dispatchEvent(new Event("dz-admin-refresh"));
      router.refresh();
    } catch {
      setError("Could not refund.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`refund-controls ${compact ? "is-compact" : ""}`}>
      {asking ? (
        <div className="action-confirm">
          <p>
            {asking === "full"
              ? `Refund the remaining ${formatMoney(left)}${stripe ? " through Stripe" : ""} to the same card or wallet?`
              : `Refund ${formatMoney(partialPence)}${stripe ? " through Stripe" : ""} as a partial refund?`}
          </p>
          <span className="action-confirm-row">
            <button type="button" className="btn btn-ember" disabled={busy} onClick={() => send(asking)}>
              {busy ? "Refunding…" : asking === "full" ? "Full refund" : "Partial refund"}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setAsking(null)}>
              Back
            </button>
          </span>
        </div>
      ) : (
        <>
          <div className="refund-controls-row">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setAsking("full")}>
              Full refund {formatMoney(left)}
            </button>
            <label className="refund-partial">
              <span>Partial</span>
              <input
                inputMode="decimal"
                placeholder={(left / 100).toFixed(2)}
                value={pounds}
                onChange={(e) => setPounds(e.target.value)}
              />
            </label>
            <button type="button" className="btn btn-ghost" disabled={busy || !pounds} onClick={() => setAsking("partial")}>
              Partial refund
            </button>
          </div>
          <div className="refund-controls-row">
            <select value={reasonId} onChange={(e) => setReasonId(e.target.value as (typeof reasons)[number]["id"])}>
              {reasons.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
            {reasonId === "other" || !compact ? (
              <input
                className="refund-reason"
                placeholder={reasonId === "other" ? "Reason (required)" : "Note (optional)"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            ) : null}
          </div>
        </>
      )}
      {error ? <p className="action-error">{error}</p> : null}
    </div>
  );
}
