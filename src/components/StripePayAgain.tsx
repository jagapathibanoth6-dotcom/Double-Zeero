"use client";

import { useEffect, useState } from "react";
import type { LocationId } from "@/data/site";
import { startStripeCheckout } from "@/lib/platform/stripe-client";

export function StripePayAgain({
  locationId,
  orderId,
  bookingId,
  cancelPath,
  label = "Pay now",
}: {
  locationId: LocationId;
  orderId?: string;
  bookingId?: string;
  cancelPath: string;
  label?: string;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/pay/ready?locationId=${locationId}`)
      .then((res) => res.json())
      .then((data) => setReady(Boolean(data.ready)))
      .catch(() => setReady(false));
  }, [locationId]);

  if (!ready) return null;

  return (
    <div className="mt-6">
      <button
        type="button"
        className="btn btn-ember"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await startStripeCheckout({ locationId, orderId, bookingId, cancelPath });
          } catch (err) {
            setBusy(false);
            setError(err instanceof Error ? err.message : "Could not start payment.");
          }
        }}
      >
        {busy ? "Opening Stripe…" : label}
      </button>
      {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
    </div>
  );
}
