"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "@/lib/platform/money";
import type { LocationId } from "@/data/site";
import { DEMO_CARD, detectDevice, isDemoCard, walletOptions, type PayMethod } from "@/lib/platform/wallets";

export type PayDetail = { label: string; value: string };

export function PaySheet({
  open,
  amountPence,
  title = "Pay Double Zero",
  details = [],
  locationId,
  onClose,
  onPaid,
}: {
  open: boolean;
  amountPence: number;
  title?: string;
  details?: PayDetail[];
  locationId?: LocationId;
  onClose: () => void;
  onPaid: (result: { method: PayMethod; last4?: string }) => void;
}) {
  const [wallets, setWallets] = useState(() => walletOptions("laptop"));
  const [tab, setTab] = useState<"card" | "apple" | "google">("card");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"form" | "wallet" | "scan" | "done">("form");
  const [stripeReady, setStripeReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const code = useMemo(() => `DZ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const next = walletOptions(detectDevice());
    setWallets(next);
    setTab("card");
    setStage("form");
    setError("");
    setBusy(false);
    setStripeReady(false);
    if (!locationId) return;
    fetch(`/api/pay/ready?locationId=${locationId}`)
      .then((res) => res.json())
      .then((data) => setStripeReady(Boolean(data.ready)))
      .catch(() => setStripeReady(false));
  }, [open, locationId]);

  if (!open || !mounted) return null;

  function formatCard(value: string) {
    return value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  function formatExp(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  async function finish(method: PayMethod, last4?: string) {
    if (method === "STRIPE") {
      setBusy(true);
      onPaid({ method, last4 });
      return;
    }
    setBusy(true);
    setStage("done");
    await new Promise((resolve) => setTimeout(resolve, 700));
    onPaid({ method, last4 });
  }

  async function payCard() {
    setError("");
    if (!isDemoCard(number, cvv, expiry)) {
      return setError(`Use the demo card ${DEMO_CARD.display}, ${DEMO_CARD.expiry}, CVV ${DEMO_CARD.cvv}.`);
    }
    await finish("CARD", "4444");
  }

  async function payApple() {
    setError("");
    if (wallets.appleNative) {
      setStage("wallet");
      await new Promise((resolve) => setTimeout(resolve, 1400));
      await finish("APPLE_PAY");
      return;
    }
    setStage("scan");
  }

  async function payGoogle() {
    setError("");
    setStage("wallet");
    await new Promise((resolve) => setTimeout(resolve, 1400));
    await finish("GOOGLE_PAY");
  }

  const sheet = (
    <div className="pay-sheet" role="dialog" aria-modal="true" aria-label="Payment">
      <button type="button" className="pay-sheet-back" onClick={onClose} aria-label="Close payment" />
      <div className="pay-sheet-card">
        <div className="pay-head">
          <div>
            <p className="display text-[0.62rem] tracking-[0.2em] text-ember">Secure checkout</p>
            <h2 className="serif mt-1 text-2xl leading-tight">{title}</h2>
          </div>
          <p className="pay-amount">{formatMoney(amountPence)}</p>
        </div>

        {details.length ? (
          <dl className="pay-summary">
            {details
              .filter((row) => row.value.trim())
              .map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
          </dl>
        ) : null}

        {stripeReady && stage === "form" ? (
          <div className="pay-wallet">
            <p className="text-sm text-mute">
              Card, Apple Pay and Google Pay open on Stripe. You come back here when the payment is taken.
            </p>
            <button type="button" className="btn btn-ember w-full" disabled={busy} onClick={() => finish("STRIPE")}>
              {busy ? "Opening Stripe…" : `Pay ${formatMoney(amountPence)} with Stripe`}
            </button>
          </div>
        ) : null}

        {!stripeReady && stage === "form" ? (
          <>
            <div className="pay-methods">
              <button type="button" className={tab === "card" ? "is-on" : ""} onClick={() => setTab("card")}>
                Card
              </button>
              {wallets.appleNative || wallets.appleScan ? (
                <button type="button" className={tab === "apple" ? "is-on" : ""} onClick={() => setTab("apple")}>
                  Apple Pay
                </button>
              ) : null}
              {wallets.google ? (
                <button type="button" className={tab === "google" ? "is-on" : ""} onClick={() => setTab("google")}>
                  Google Pay
                </button>
              ) : null}
            </div>

            {tab === "card" ? (
              <div className="pay-card-form">
                <label>
                  Card number
                  <input
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder={DEMO_CARD.display}
                    value={number}
                    onChange={(e) => setNumber(formatCard(e.target.value))}
                  />
                </label>
                <div className="pay-card-row">
                  <label>
                    Expiry
                    <input
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="01/01"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExp(e.target.value))}
                    />
                  </label>
                  <label>
                    CVV
                    <input
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    />
                  </label>
                </div>
                <label>
                  Name on card
                  <input autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <p className="pay-hint">Demo card {DEMO_CARD.display} · {DEMO_CARD.expiry} · CVV {DEMO_CARD.cvv}</p>
                <button type="button" className="btn btn-ember w-full" disabled={busy} onClick={payCard}>
                  Pay {formatMoney(amountPence)}
                </button>
              </div>
            ) : null}

            {tab === "apple" ? (
              <div className="pay-wallet">
                <p className="text-sm text-mute">
                  {wallets.appleNative
                    ? "This device can use Apple Pay. Confirm with Face ID, Touch ID or your passcode."
                    : "This computer has no Apple Pay. Scan the code with your iPhone to pay."}
                </p>
                <button type="button" className="pay-apple" disabled={busy} onClick={payApple}>
                  Pay with Apple Pay
                </button>
              </div>
            ) : null}

            {tab === "google" ? (
              <div className="pay-wallet">
                <p className="text-sm text-mute">This browser can use Google Pay.</p>
                <button type="button" className="pay-google" disabled={busy} onClick={payGoogle}>
                  Pay with GPay
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {stage === "wallet" ? (
          <div className="pay-confirm">
            <span className="pay-orb" />
            <p>Confirm on this device…</p>
          </div>
        ) : null}

        {stage === "scan" ? (
          <div className="pay-scan">
            <div className="pay-qr" aria-hidden="true">
              {Array.from({ length: 49 }, (_, i) => (
                <em key={i} className={code.charCodeAt(i % code.length) % 2 ? "is-on" : ""} />
              ))}
            </div>
            <p>Open Camera on your iPhone and scan to Apple Pay.</p>
            <p className="text-sm text-mute">Code {code}</p>
            <button type="button" className="btn btn-ember mt-4" onClick={() => finish("APPLE_PAY")}>
              I’ve paid on my iPhone
            </button>
          </div>
        ) : null}

        {stage === "done" ? <p className="pay-ok">Payment taken.</p> : null}

        {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
        <button type="button" className="pay-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
