const tracks = {
  collect: [
    { key: "NEW", label: "Received" },
    { key: "ACCEPTED", label: "Accepted" },
    { key: "PREPARING", label: "Making" },
    { key: "READY", label: "Ready to collect" },
    { key: "COMPLETED", label: "Collected" },
  ],
  delivery: [
    { key: "NEW", label: "Received" },
    { key: "ACCEPTED", label: "Accepted" },
    { key: "PREPARING", label: "Making" },
    { key: "READY", label: "Ready" },
    { key: "DISPATCHED", label: "On the way" },
    { key: "COMPLETED", label: "Delivered" },
  ],
  table: [
    { key: "PENDING_DEPOSIT", label: "Deposit" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "SEATED", label: "At the table" },
    { key: "COMPLETED", label: "Finished" },
  ],
  bookingCollect: [
    { key: "CONFIRMED", label: "Booked" },
    { key: "READY", label: "Ready" },
    { key: "COMPLETED", label: "Collected" },
  ],
  enquiry: [
    { key: "ENQUIRY", label: "Sent" },
    { key: "REVIEW", label: "Reviewing" },
    { key: "CONFIRMED", label: "Confirmed" },
  ],
} as const;

export type TrackKind = keyof typeof tracks;

export function trackKindFrom(source?: string, visitType?: string, status?: string): TrackKind {
  if (status === "ENQUIRY") return "enquiry";
  if (source === "DZ_DELIVERY") return "delivery";
  if (source === "CLICK_COLLECT" || source === "POS" || source === "PARTY") return "collect";
  if (visitType === "collection") return "bookingCollect";
  return "table";
}

function pinIndex(kind: TrackKind, status?: string) {
  const steps = tracks[kind];
  if (status === "CANCELLED") return -1;
  const exact = steps.findIndex((step) => step.key === status);
  if (exact >= 0) return exact;
  if (kind === "table" && status === "CONFIRMED") return 1;
  if (kind === "bookingCollect" && (status === "CONFIRMED" || status === "PENDING_DEPOSIT")) return 0;
  if (kind === "collect" || kind === "delivery") {
    if (status === "COMPLETED") return steps.length - 1;
  }
  return 0;
}

export function TrackPins({
  kind,
  status,
  compact = false,
}: {
  kind: TrackKind;
  status?: string;
  compact?: boolean;
}) {
  const steps = tracks[kind];
  const active = pinIndex(kind, status);
  const cancelled = status === "CANCELLED";
  return (
    <ol className={`track-pins ${compact ? "is-compact" : ""} ${cancelled ? "is-cancelled" : ""}`} aria-label="Tracking">
      {steps.map((step, index) => {
        const state = cancelled ? "is-off" : index < active ? "is-done" : index === active ? "is-now" : "is-wait";
        return (
          <li key={step.key} className={state}>
            <span className="track-pin" aria-hidden="true">
              <i />
            </span>
            <em>{step.label}</em>
          </li>
        );
      })}
    </ol>
  );
}

export function DeliveryPins({
  status,
  restaurant,
  address,
}: {
  status?: string;
  restaurant?: string;
  address?: string;
}) {
  const point = status === "DELIVERED" || status === "COMPLETED" ? 2 : status === "ON_THE_WAY" || status === "DISPATCHED" ? 1 : 0;
  const places = [
    { label: "Restaurant", value: restaurant || "Double Zero" },
    { label: "Courier", value: "On the road" },
    { label: "Home", value: address || "Your address" },
  ];
  return (
    <ol className="track-pins is-places" aria-label="Delivery route">
      {places.map((place, index) => {
        const state = index < point ? "is-done" : index === point ? "is-now" : "is-wait";
        return (
          <li key={place.label} className={state}>
            <span className="track-pin" aria-hidden="true">
              <i />
            </span>
            <strong>{place.label}</strong>
            <em>{place.value}</em>
          </li>
        );
      })}
    </ol>
  );
}
