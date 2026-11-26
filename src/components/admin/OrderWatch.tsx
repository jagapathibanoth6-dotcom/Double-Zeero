"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Alert = {
  id: string;
  ref: string;
  label: string;
  name: string;
  when: string;
  items: string;
  isNew: boolean;
  isDue: boolean;
};

const SEEN = "dz-order-seen";
const REMINDED = "dz-order-reminded";

function readIds(key: string) {
  try {
    const raw = sessionStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function writeIds(key: string, ids: Set<string>) {
  sessionStorage.setItem(key, JSON.stringify([...ids]));
}

function toast(message: string) {
  window.dispatchEvent(new CustomEvent("dz-admin-toast", { detail: message }));
}

function ping(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: title });
  } catch {
    /* ignore */
  }
}

export function OrderWatch() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }

    let first = true;
    let timer = 0;

    async function poll() {
      const res = await fetch("/api/admin/order-watch", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { alerts?: Alert[] };
      const alerts = data.alerts || [];
      const seen = readIds(SEEN);
      const reminded = readIds(REMINDED);

      if (first) {
        alerts.forEach((alert) => seen.add(alert.id));
        writeIds(SEEN, seen);
        first = false;
      } else {
        for (const alert of alerts) {
          if (seen.has(alert.id)) continue;
          seen.add(alert.id);
          const message = `${alert.label} ${alert.ref} · ${alert.name} · ${alert.when}`;
          toast(`New ${message}`);
          ping(`New ${alert.label}`, `${alert.ref} · ${alert.name} · ${alert.when}`);
        }
        writeIds(SEEN, seen);
      }

      for (const alert of alerts) {
        if (!alert.isDue || reminded.has(alert.id)) continue;
        reminded.add(alert.id);
        const message = `Reminder: ${alert.label} ${alert.ref} · ${alert.when}`;
        toast(message);
        ping(message, alert.items || alert.name);
      }
      writeIds(REMINDED, reminded);

      const live = alerts.filter((alert) => alert.isNew || alert.isDue).length;
      window.dispatchEvent(new CustomEvent("dz-order-alerts", { detail: { count: live } }));
    }

    poll();
    timer = window.setInterval(poll, 8000);
    return () => window.clearInterval(timer);
  }, [pathname]);

  return null;
}
