"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fromMinutes, toMinutes } from "@/lib/booking";
import { BOOKING_SLOT, DIARY_SLOT, diarySlots } from "@/lib/platform/diary";
import { WalkInHeading } from "@/components/admin/WalkInHeading";

export type SlotKind = "inside" | "collect" | "delivery" | "walkin";

export type SlotItem = {
  id: string;
  time: string;
  durationMin?: number;
  until?: string;
  name: string;
  ref: string;
  guests?: number;
  tableCodes?: string;
  status: string;
  kind: SlotKind;
  note?: string;
  href: string;
  paid?: boolean;
  payText?: string;
  items?: string;
  /** Extra details shown in the day list. */
  phone?: string;
  notes?: string;
  highchair?: boolean;
  party?: boolean;
};

const labels: Record<SlotKind, string> = {
  inside: "Inside",
  collect: "Click & collect",
  delivery: "Delivery",
  walkin: "Walk-in",
};

const BASE_W = 112;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.6;
const LANE_H = 86;
const LANE_GAP = 6;
const LANE_TOP = 34;

function londonClock() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { hour, minute: get("minute"), second: get("second") };
}

function itemDuration(item: SlotItem) {
  if (item.durationMin) return item.durationMin;
  if (item.kind === "inside" || item.kind === "walkin") return 90;
  return 15;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export function BookingDiary({
  items,
  open,
  close,
  live,
  walkInTime,
  onWalkInTime,
  onAddWalkIn,
}: {
  items: SlotItem[];
  open: string;
  close: string;
  live?: boolean;
  walkInTime?: string;
  onWalkInTime?: (time: string) => void;
  onAddWalkIn?: (time: string) => void;
}) {
  const slots = useMemo(() => diarySlots(open, close), [open, close]);
  const walkInSlots = useMemo(() => diarySlots(open, close, BOOKING_SLOT), [open, close]);
  const [clock, setClock] = useState(londonClock);
  const [zoom, setZoom] = useState(1);
  const liveRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setClock(londonClock());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!live) return;
    liveRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [live, slots.length, zoom]);

  const slotW = Math.round(BASE_W * zoom);
  const openMins = toMinutes(open);
  const closeMins = toMinutes(close);
  const nowMins = toMinutes(`${clock.hour}:${clock.minute}`) + Number(clock.second) / 60;
  const clamped = Math.min(Math.max(nowMins, openMins), closeMins);
  const showLive = Boolean(live);
  const liveLeft = ((clamped - openMins) / DIARY_SLOT) * slotW;
  const asapItems = items.filter((item) => !item.time || item.time === "ASAP");
  const columns = asapItems.length ? ["ASAP", ...slots] : slots;
  const offset = asapItems.length ? slotW : 0;
  const nowLabel = `${clock.hour}:${clock.minute}:${clock.second}`;

  const placed = useMemo(() => {
    const rows: { item: SlotItem; start: number; end: number; lane: number }[] = [];
    const ordered = items
      .filter((item) => item.time && item.time !== "ASAP")
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time) || a.name.localeCompare(b.name));
    for (const item of ordered) {
      const start = toMinutes(item.time);
      const end = start + itemDuration(item);
      let lane = 0;
      while (rows.some((row) => row.lane === lane && overlaps(start, end, row.start, row.end))) lane += 1;
      rows.push({ item, start, end, lane });
    }
    return rows;
  }, [items]);

  const laneCount = Math.max(1, ...placed.map((row) => row.lane + 1), asapItems.length);
  const boardH = LANE_TOP + laneCount * (LANE_H + LANE_GAP) + 16;
  const used = new Set(placed.map((row) => fromMinutes(Math.floor(row.start / DIARY_SLOT) * DIARY_SLOT)));

  function changeZoom(next: number) {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next * 10) / 10)));
  }

  function shift(direction: -1 | 1) {
    scrollRef.current?.scrollBy({ left: direction * slotW * 3, behavior: "smooth" });
  }

  function cardStyle(left: number, width: number, lane: number): CSSProperties {
    return {
      left,
      width: Math.max(width, slotW * 0.45),
      top: LANE_TOP + lane * (LANE_H + LANE_GAP),
      height: LANE_H,
    };
  }

  return (
    <div className="diary" style={{ ["--slot-w" as string]: `${slotW}px` }}>
      <div className="diary-legend">
        {onAddWalkIn ? (
          <WalkInHeading
            slots={walkInSlots}
            time={walkInTime && walkInSlots.includes(walkInTime) ? walkInTime : walkInSlots[0] || ""}
            onTime={(time) => onWalkInTime?.(time)}
            onSeat={(time) => onAddWalkIn(time)}
          />
        ) : null}
        <div className="diary-zoom">
          <button type="button" onClick={() => changeZoom(zoom - 0.15)} aria-label="Zoom out">
            −
          </button>
          <em>{Math.round(zoom * 100)}%</em>
          <button type="button" onClick={() => changeZoom(zoom + 0.15)} aria-label="Zoom in">
            +
          </button>
        </div>
        <strong className="diary-hours">
          Open {open}–{close} · {slots.length} slots
        </strong>
        <strong className={`diary-live-clock ${showLive ? "is-on" : ""}`}>
          {showLive ? `LIVE ${nowLabel}` : fromMinutes(toMinutes(`${clock.hour}:${clock.minute}`))}
        </strong>
      </div>

      <div className="diary-board">
        <button type="button" className="diary-shift is-left" onClick={() => shift(-1)} aria-label="Scroll times back">
          ‹
        </button>
        <div className="diary-scroller" ref={scrollRef}>
          <div className="diary-track" style={{ width: columns.length * slotW }}>
            <div className="diary-ruler">
              {columns.map((time) => (
                <div
                  key={time}
                  className={`diary-tick ${time.endsWith(":00") || time === "ASAP" ? "is-hour" : ""} ${used.has(time) || (time === "ASAP" && asapItems.length) ? "has-items" : ""}`}
                >
                  {time}
                </div>
              ))}
              <div className="diary-livebar">
                <div className="diary-livebar-fill" style={{ width: showLive ? offset + liveLeft : 0 }} />
              </div>
              {showLive ? (
                <div ref={liveRef} className="diary-live-head" style={{ left: offset + liveLeft }}>
                  <span>{nowLabel}</span>
                </div>
              ) : null}
            </div>

            <div className="diary-cols" style={{ minHeight: boardH }}>
              {columns.map((time) => (
                <div key={time} className="diary-col">
                  <span className="diary-col-pad" />
                </div>
              ))}

              {asapItems.map((item, index) => (
                <DiaryCard key={item.id} item={item} style={cardStyle(4, slotW - 8, index)} />
              ))}
              {placed.map((row) => {
                const left = offset + ((row.start - openMins) / DIARY_SLOT) * slotW + 3;
                const width = (itemDuration(row.item) / DIARY_SLOT) * slotW - 6;
                return <DiaryCard key={row.item.id} item={row.item} style={cardStyle(left, width, row.lane)} />;
              })}

              {showLive ? (
                <>
                  <div className="diary-elapsed" style={{ width: offset + liveLeft }} />
                  <div className="diary-live-line" style={{ left: offset + liveLeft }} />
                </>
              ) : null}
            </div>
          </div>
        </div>
        <button type="button" className="diary-shift is-right" onClick={() => shift(1)} aria-label="Scroll times forward">
          ›
        </button>
      </div>
    </div>
  );
}

function DiaryCard({ item, style }: { item: SlotItem; style: CSSProperties }) {
  const walkInBooking = item.kind === "walkin" && item.href.startsWith("/admin/bookings/");
  return (
    <div className={`diary-card is-${item.kind} ${walkInBooking ? "has-actions" : ""}`} style={style}>
      <Link href={item.href} className="diary-card-main">
        <p className="diary-card-kind">{labels[item.kind]}</p>
        <p className="diary-card-name">{item.name}</p>
        <p className="diary-card-time">{item.until ? `${item.time}–${item.until}` : item.time}</p>
        <p className="diary-card-meta">
          {item.guests ? `${item.guests} pax` : item.note || item.ref}
          {item.tableCodes ? ` · ${item.tableCodes}` : ""}
        </p>
        {item.paid || item.payText ? (
          <span className={`pay-badge ${item.paid ? "is-paid" : item.payText?.startsWith("Part") ? "is-part" : "is-unpaid"}`}>
            {item.paid ? "Paid" : item.payText?.startsWith("Part") ? "Part paid" : "Unpaid"}
          </span>
        ) : null}
      </Link>
      {walkInBooking ? (
        <div className="diary-card-actions">
          <Link href={`${item.href}/cancel`}>Cancel</Link>
          <Link href={`${item.href}/delete`}>Delete</Link>
        </div>
      ) : null}
    </div>
  );
}
