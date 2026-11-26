"use client";

import { useRouter } from "next/navigation";
import { shiftISO } from "@/lib/platform/diary";

export function DateNav({
  date,
  today,
  base,
}: {
  date: string;
  today: string;
  base: string;
}) {
  const router = useRouter();

  function go(next: string) {
    router.push(next === today ? base : `${base}?date=${next}`);
  }

  return (
    <div className="date-nav">
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
    </div>
  );
}
