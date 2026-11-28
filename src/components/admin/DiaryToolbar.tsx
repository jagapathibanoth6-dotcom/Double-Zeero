"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBookingDate, londonParts, toMinutes } from "@/lib/booking";
import { BOOKING_SLOT, diarySlots, shiftISO } from "@/lib/platform/diary";
import { BookingDiary, type SlotItem, type SlotKind } from "@/components/admin/BookingDiary";
import { WalkInForm } from "@/components/admin/WalkInForm";
import { BookingDayList } from "@/components/admin/BookingDayList";

type View = "list" | "timeline";
const VIEW_KEY = "dz-bookings-view";

type Filter = "all" | Exclude<SlotKind, "delivery">;

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "inside", label: "Inside" },
  { id: "walkin", label: "Walk-in" },
  { id: "collect", label: "Click & collect" },
];

export function DiaryToolbar({
  date,
  today,
  branchName,
  items,
  tables,
  open,
  close,
  live,
}: {
  date: string;
  today: string;
  branchName: string;
  items: SlotItem[];
  tables: { code: string; seats: number }[];
  open?: string | null;
  close?: string | null;
  live?: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [walkInTime, setWalkInTime] = useState<string | null>(null);
  const walkInSlots = useMemo(() => (open && close ? diarySlots(open, close, BOOKING_SLOT) : []), [open, close]);
  const [headTime, setHeadTime] = useState(open || "");
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [nowMins, setNowMins] = useState(-1);

  // Remember the chosen view, and keep "now" ticking for the day list.
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === "list" || saved === "timeline") setView(saved);
    const tick = () => {
      const now = londonParts();
      setNowMins(toMinutes(`${now.hour}:${now.minute}`));
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function chooseView(next: View) {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  }

  useEffect(() => {
    if (!walkInSlots.length) return;
    const now = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const hhmm = now === "24:00" ? "00:00" : now;
    const nearest = walkInSlots.reduce(
      (best, slot) => (Math.abs(toMinutes(slot) - toMinutes(hhmm)) < Math.abs(toMinutes(best) - toMinutes(hhmm)) ? slot : best),
      walkInSlots[0],
    );
    setHeadTime(live ? nearest : walkInSlots[0]);
  }, [walkInSlots, live]);

  const counts = useMemo(
    () => ({
      all: items.length,
      inside: items.filter((item) => item.kind === "inside").length,
      walkin: items.filter((item) => item.kind === "walkin").length,
      collect: items.filter((item) => item.kind === "collect").length,
    }),
    [items],
  );

  const search = query.trim().toLowerCase();
  const visible = items
    .filter((item) => filter === "all" || item.kind === filter)
    .filter(
      (item) =>
        !search ||
        [item.name, item.ref, item.phone, item.tableCodes, item.notes]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search)),
    );

  const stats = useMemo(() => {
    const seated = items.filter((item) => item.kind !== "collect");
    const upcoming = live
      ? items
          .filter((item) => item.time !== "ASAP" && toMinutes(item.time) >= nowMins)
          .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))[0]
      : [...items].filter((item) => item.time !== "ASAP").sort((a, b) => toMinutes(a.time) - toMinutes(b.time))[0];
    return [
      { label: "Bookings", value: items.filter((item) => item.kind === "inside").length, tone: "ember" },
      { label: "Covers", value: seated.reduce((sum, item) => sum + (item.guests || 0), 0), tone: "gold" },
      { label: "Walk-ins", value: counts.walkin, tone: "amber" },
      { label: "Collections", value: counts.collect, tone: "teal" },
      {
        label: "To pay",
        value: items.filter((item) => item.payText && !item.paid && !/refund/i.test(item.payText)).length,
        tone: "wine",
      },
      { label: live ? "Next arrival" : "First arrival", value: upcoming ? upcoming.time : "—", tone: "navy" },
    ];
  }, [items, counts, live, nowMins]);

  function addWalkIn(time?: string) {
    const nearest = time || headTime || walkInSlots[0];
    if (!nearest) return;
    setHeadTime(nearest);
    setWalkInTime(nearest);
  }

  function go(nextDate: string) {
    router.push(`/admin/bookings?date=${nextDate}`);
  }

  return (
    <>
      <div className="bookings-head">
        <div>
          <h1 className="admin-page-title">Bookings</h1>
          <p className="admin-page-copy">
            {formatBookingDate(date)} · {branchName}
            {open && close ? ` · open ${open}–${close}` : " · closed"}
          </p>
        </div>
        <div className="bookings-head-actions">
          <div className="view-switch" role="tablist" aria-label="Bookings view">
            <button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "is-on" : ""} onClick={() => chooseView("list")}>
              List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "timeline"}
              className={view === "timeline" ? "is-on" : ""}
              onClick={() => chooseView("timeline")}
            >
              Timeline
            </button>
          </div>
          {open && close ? (
            <button type="button" className="btn btn-ember" onClick={() => addWalkIn()}>
              + Add walk-in
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-stat-grid bookings-stats">
        {stats.map((stat) => (
          <div key={stat.label} className={`admin-stat is-${stat.tone}`}>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="diary-toolbar">
        <div className="diary-date-nav">
          <button type="button" className="diary-nav-btn" onClick={() => go(shiftISO(date, -1))} aria-label="Previous day">
            ‹
          </button>
          <input
            className="diary-date-input"
            type="date"
            value={date}
            onChange={(e) => e.target.value && go(e.target.value)}
          />
          <button type="button" className="diary-nav-btn" onClick={() => go(shiftISO(date, 1))} aria-label="Next day">
            ›
          </button>
          <button type="button" className="diary-today" onClick={() => go(today)}>
            Today
          </button>
        </div>
        <input
          className="bookings-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, reference, phone or table"
          aria-label="Search bookings"
        />
        <div className="diary-filters">
          {filters.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`diary-filter is-${row.id} ${filter === row.id ? "is-on" : ""}`}
              onClick={() => setFilter(row.id)}
            >
              {row.label}
              <em>{counts[row.id]}</em>
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? (
        <BookingDayList items={visible} nowMins={nowMins} live={live} onAddWalkIn={(time) => addWalkIn(time)} />
      ) : open && close ? (
        <BookingDiary
          items={visible}
          open={open}
          close={close}
          live={live}
          walkInTime={headTime}
          onWalkInTime={setHeadTime}
          onAddWalkIn={(time) => {
            setHeadTime(time);
            setWalkInTime(time);
          }}
        />
      ) : (
        <div className="admin-panel">
          <p className="text-mute">This branch is closed on this date.</p>
        </div>
      )}

      {walkInTime ? (
        <WalkInForm
          key={walkInTime}
          date={date}
          time={walkInTime}
          slots={walkInSlots}
          tables={tables}
          onClose={() => setWalkInTime(null)}
        />
      ) : null}
    </>
  );
}
