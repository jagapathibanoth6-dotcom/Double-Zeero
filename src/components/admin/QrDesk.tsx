"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QrRow = { id: string; name: string; slug: string };

const NAMES = ["Book a table", "Click & collect"] as const;

function qrImage(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&ecc=H&margin=8&color=23-16-12&bgcolor=255-250-242&data=${encodeURIComponent(data)}`;
}

export function QrDesk({
  codes,
  scanOrigin,
  locationId,
  bookingPath,
}: {
  codes: QrRow[];
  restaurant: { name: string; shortName: string; address: string; phone: string };
  locationId: string;
  bookingPath: string;
  scanOrigin: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [base, setBase] = useState(scanOrigin);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("dz-qr-origin");
    if (saved && !/localhost|127\.0\.0\.1/i.test(saved)) setBase(saved);
    else setBase(scanOrigin);
  }, [scanOrigin]);

  function hrefFor(code: QrRow) {
    return `${base.replace(/\/+$/, "")}/go/${code.slug}`;
  }

  function posterHref(code: QrRow) {
    return `/poster/${code.slug}?base=${encodeURIComponent(base.replace(/\/+$/, ""))}`;
  }

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(res.ok ? "Saved." : data.error || "Could not save.");
    if (res.ok) {
      setName("");
      router.refresh();
    }
  }

  return (
    <section className="admin-panel qr-desk">
      <div className="today-panel-head">
        <div>
          <h2>QR posters</h2>
          <p>One code per poster. Scan opens book a table and click & collect.</p>
        </div>
      </div>

      <form
        className="qr-create"
        onSubmit={(e) => {
          e.preventDefault();
          post({ action: "save_qr", name });
        }}
      >
        <label>
          Poster name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Door, window, table tent" required />
        </label>
        <label>
          Phone scan URL
          <input
            value={base}
            onChange={(e) => {
              setBase(e.target.value);
              window.localStorage.setItem("dz-qr-origin", e.target.value);
            }}
            placeholder="http://192.168.1.130:3000"
          />
        </label>
        <button className="btn btn-ember" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create poster"}
        </button>
      </form>
      <p className="qr-hint">Keep the Wi‑Fi address so a phone can open the scan page. Open the poster to print A4 colour.</p>

      {codes.length ? (
        <div className="qr-list">
          {codes.map((code) => {
            const href = hrefFor(code);
            return (
              <article key={code.id} className="qr-card">
                <img className="qr-thumb" src={qrImage(href)} alt={`QR for ${code.name}`} />
                <div className="qr-card-body">
                  <h3>{code.name}</h3>
                  <p className="qr-card-names">{NAMES.join(" · ")}</p>
                  <p className="qr-link">{href}</p>
                  <p className="qr-link">
                    Book · {base.replace(/\/+$/, "")}
                    {bookingPath}?via={encodeURIComponent(code.name)}
                  </p>
                  <p className="qr-link">
                    Collect · {base.replace(/\/+$/, "")}/order/collect?location={locationId}&via={encodeURIComponent(code.name)}
                  </p>
                  <div className="qr-actions">
                    <a href={href} target="_blank" rel="noreferrer">
                      Open scan
                    </a>
                    <a href={posterHref(code)} target="_blank" rel="noreferrer">
                      Open poster
                    </a>
                    <button type="button" onClick={() => navigator.clipboard.writeText(href)}>
                      Copy link
                    </button>
                    <button type="button" onClick={() => post({ action: "delete_qr", id: code.id })}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="today-empty">No posters yet. Name one for the door, window or a table tent.</p>
      )}
      {message ? <p className="record-note">{message}</p> : null}
    </section>
  );
}
