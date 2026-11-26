"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TableRow = { id: string; code: string; seats: number; x: number; y: number; active: boolean };

export function TableDesk({
  tables,
  occupied = [],
}: {
  tables: TableRow[];
  occupied?: string[];
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [seats, setSeats] = useState(2);
  const [message, setMessage] = useState("");

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMessage(res.ok ? "Saved." : data.error || "Could not save.");
    if (res.ok) router.refresh();
  }

  function nextPlace() {
    const n = tables.length;
    return { x: (n % 8) + 1, y: Math.floor(n / 8) + 1 };
  }

  function addTable() {
    if (!code.trim()) return;
    post({ action: "save_table", code, seats, ...nextPlace() });
    setCode("");
    setSeats(2);
  }

  return (
    <div
      className="table-simple"
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
    >
      <table className="seat-sheet">
        <thead>
          <tr>
            <th>Table</th>
            <th>Seats</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tables.map((table) => {
            const busy = occupied.includes(table.code);
            return (
              <tr key={table.id}>
                <td>
                  <strong>{table.code}</strong>
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    defaultValue={table.seats}
                    aria-label={`Seats for ${table.code}`}
                    onBlur={(e) => {
                      const next = Number(e.target.value);
                      if (next > 0 && next !== table.seats) {
                        post({ action: "save_table", ...table, seats: next });
                      }
                    }}
                  />
                </td>
                <td>
                  <button type="button" disabled={busy} onClick={() => post({ action: "delete_table", id: table.id })}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
          <tr className="seat-sheet-add">
            <td>
              <input
                placeholder="T1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTable();
                }}
                aria-label="Table number"
              />
            </td>
            <td>
              <input
                type="number"
                min={1}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTable();
                }}
                aria-label="Number of seats"
              />
            </td>
            <td>
              <button className="btn btn-ember" type="button" onClick={addTable}>
                Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      {message ? <p className="record-note">{message}</p> : null}
    </div>
  );
}
