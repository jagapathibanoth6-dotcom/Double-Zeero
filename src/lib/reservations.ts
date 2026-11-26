import { promises as fs } from "fs";
import path from "path";
import type { Reservation } from "@/lib/booking";

const FILE = path.join(process.cwd(), "data", "reservations.json");

export async function readReservations(): Promise<Reservation[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Reservation[];
  } catch {
    return [];
  }
}

export async function writeReservations(rows: Reservation[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(rows, null, 2));
}
