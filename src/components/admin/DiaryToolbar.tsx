"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toMinutes } from "@/lib/booking";
import { BOOKING_SLOT, diarySlots, shiftISO } from "@/lib/platform/diary";
import { BookingDiary, type SlotItem, type SlotKind } from "@/components/admin/BookingDiary";
import { WalkInForm } from "@/components/admin/WalkInForm";

type Filter = "all" | SlotKind;

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "inside", label: "Inside" },
  { id: "walkin", label: "Walk-in" },
  { id: "collect", label: "Click & collect" },
  { id: "delivery", label: "Home delivery" },
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
      delivery: items.filter((item) => item.kind === "delivery").length,
    }),
    [items],
  );

  const visible = filter === "all" ? items : items.filter((item) => item.kind === filter);

  function go(nextDate: string) {
    router.push(`/admin/bookings?date=${nextDate}`);
  }

  return (
    <>
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
          <span className="diary-branch">{branchName}</span>
        </div>
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

      {open && close ? (
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
