"use client";

import { usePathname } from "next/navigation";

const tabs = [
  { href: "/book", label: "Book a table", match: (path: string) => path === "/book" || path.endsWith("/book") },
  { href: "/order/collect?via=Website", label: "Click & collect", match: (path: string) => path.startsWith("/order/collect") },
];

export function MobileDock() {
  const pathname = usePathname();
  return (
    <nav className="site-actions" aria-label="Book and order">
      {tabs.map((tab) => (
        <a key={tab.href} href={tab.href} className={tab.match(pathname) ? "is-on" : "is-off"}>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
