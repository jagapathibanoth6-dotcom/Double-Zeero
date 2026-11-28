"use client";

import Link from "next/link";
import { useMemo } from "react";
import { toMinutes } from "@/lib/booking";
import { statusText, statusTone } from "@/lib/platform/order-label";
import type { SlotItem, SlotKind } from "@/components/admin/BookingDiary";

const kindLabel: Record<SlotKind, string> = {
  inside: "Table",
  walkin: "Walk-in",
  collect: "Click & collect",
  delivery: "Delivery",
};

function sortKey(time: string) {
  return time === "ASAP" ? -1 : toMinutes(time);
}

/**
 * The whole day's bookings and collections in one list, grouped by time, so
 * staff can see everything at once without scrolling sideways.
 */
export function BookingDayList({
  items,
  nowMins,
  live,
  onAddWalkIn,
}: {
  items: SlotItem[];
  nowMins: number;
  live?: boolean;
  onAddWalkIn: (time: string) => void;
}) {
  const groups = useMemo(() => {
    const byTime = new Map<string, SlotItem[]>();
    for (const item of [...items].sort((a, b) => sortKey(a.time) - sortKey(b.time) || a.name.localeCompare(b.name))) {
      const key = item.time || "—";
      byTime.set(key, [...(byTime.get(key) || []), item]);
    }
    return [...byTime.entries()];
  }, [items]);

  if (!items.length) {
    return (
      <div className="day-list-empty">
        <p className="day-list-empty-title">Nothing booked for this day</p>
        <p>Bookings, walk-ins and click & collect orders will appear here.</p>
      </div>
    );
  }

  return (
    <div className="day-list">
      {groups.map(([time, rows]) => {
        const mins = time === "ASAP" ? -1 : toMinutes(time);
        const past = live && mins >= 0 && mins + 90 <= nowMins;
        const now = live && mins >= 0 && mins <= nowMins && nowMins < mins + 90;
        const covers = rows.reduce((sum, row) => sum + (row.guests || 0), 0);
        return (
          <section key={time} className={`day-slot ${past ? "is-past" : ""} ${now ? "is-now" : ""}`}>
            <header className="day-slot-head">
              <time>{time}</time>
              <span>
                {rows.length} {rows.length === 1 ? "entry" : "entries"}
                {covers ? ` · ${covers} covers` : ""}
              </span>
              {now ? <em className="day-slot-now">Now</em> : null}
              {time !== "ASAP" ? (
                <button type="button" className="day-slot-add" onClick={() => onAddWalkIn(time)}>
                  + Walk-in
                </button>
              ) : null}
            </header>
            <ul className="day-rows">
              {rows.map((row) => (
                <li key={`${row.kind}-${row.id}`}>
                  <Link href={row.href} className={`day-row is-${row.kind}`}>
                    <div className="day-row-main">
                      <p className="day-row-name">
                        {row.name}
                        {row.party ? <span className="day-chip is-party">Party</span> : null}
                        {row.highchair ? <span className="day-chip">Highchair</span> : null}
                      </p>
                      <p className="day-row-meta">
                        {[row.ref, row.until ? `until ${row.until}` : "", row.phone].filter(Boolean).join(" · ")}
                      </p>
                      {row.notes ? <p className="day-row-note">“{row.notes}”</p> : null}
                      {row.items ? <p className="day-row-items">{row.items}</p> : null}
                    </div>
                    <div className="day-row-facts">
                      <span className={`day-kind is-${row.kind}`}>{kindLabel[row.kind]}</span>
                      {row.guests ? (
                        <span className="day-fact">
                          <b>{row.guests}</b> {row.guests === 1 ? "guest" : "guests"}
                        </span>
                      ) : null}
                      {row.tableCodes ? (
                        <span className="day-fact">
                          Table <b>{row.tableCodes.split(",").join(", ")}</b>
                        </span>
                      ) : null}
                    </div>
                    <div className="day-row-status">
                      <span className={`admin-badge ${statusTone(row.status)}`}>{statusText(row.status)}</span>
                      {row.payText ? (
                        <span className={`pay-badge ${row.paid ? "is-paid" : /refund/i.test(row.payText) ? "is-refunded" : /part/i.test(row.payText) ? "is-part" : "is-unpaid"}`}>
                          {row.payText.split(" · ")[0]}
                        </span>
                      ) : null}
                      <span className="day-row-open" aria-hidden="true">
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
