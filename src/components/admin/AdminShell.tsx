"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { locations, type LocationId } from "@/data/site";
import { AdminToast } from "@/components/admin/AdminToast";
import { OrderWatch } from "@/components/admin/OrderWatch";
import { BranchSwitch } from "@/components/admin/BranchSwitch";
import { MenuBurger } from "@/components/MenuBurger";

const groups = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Today", icon: "today" },
    ],
  },
  {
    label: "Front of house",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: "bookings" },
      { href: "/admin/collect", label: "Click & collect", icon: "collect" },
      { href: "/admin/orders", label: "Orders", icon: "orders" },
      { href: "/admin/parties", label: "Parties", icon: "parties" },
      { href: "/admin/enquiries", label: "Enquiries", icon: "enquiries" },
      { href: "/admin/waitlist", label: "Waitlist", icon: "waitlist" },
    ],
  },
  {
    label: "Service",
    items: [
      { href: "/admin/kitchen", label: "Kitchen", icon: "kitchen" },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/admin/payments", label: "Payments", icon: "payments" },
      { href: "/admin/customers", label: "Customers", icon: "customers", global: true },
      { href: "/admin/menu", label: "Menu", icon: "menu" },
      { href: "/admin/gallery", label: "Gallery", icon: "gallery", global: true },
      { href: "/admin/settings", label: "Settings", icon: "settings" },
    ],
  },
];

function NavIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {name === "today" ? <path d="M7 3v2M17 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8 12h3v3H8z" /> : null}
      {name === "bookings" ? <path d="M4 6h16M4 12h16M4 18h10" /> : null}
      {name === "parties" ? <path d="M16 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM21 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM4 20v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1" /> : null}
      {name === "enquiries" ? <path d="M4 6h16v12H4zM4 8l8 6 8-6" /> : null}
      {name === "waitlist" ? <path d="M12 7v6l4 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" /> : null}
      {name === "tables" ? <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /> : null}
      {name === "orders" ? <path d="M7 7V6a5 5 0 0 1 10 0v1M6 7h12l-1 13H7L6 7z" /> : null}
      {name === "collect" ? <path d="M4 7h16l-1.2 12H5.2L4 7zM8 7V5a4 4 0 0 1 8 0v2M9 12h6" /> : null}
      {name === "kitchen" ? <path d="M8 10c0-3 2-5 4-5s4 2 4 5v9H8v-9zM8 14h8" /> : null}
      {name === "customers" ? <path d="M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" /> : null}
      {name === "menu" ? <path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" /> : null}
      {name === "gallery" ? <path d="M4 6h16v12H4zM8 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4 16l5-5 3 3 3-4 5 6" /> : null}
      {name === "settings" ? <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM12 3v2M12 19v2M4.9 6.5l1.6 1.2M17.5 16.3l1.6 1.2M3 12h2M19 12h2M4.9 17.5l1.6-1.2M17.5 7.7l1.6-1.2" /> : null}
      {name === "payments" ? <path d="M3 7h18v11H3zM3 11h18M7 15h4" /> : null}
    </svg>
  );
}

export function AdminShell({
  staffName,
  staffRole,
  branch,
  children,
}: {
  staffName: string;
  staffRole: string;
  branch: LocationId;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const loc = locations[branch];
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const currentGroup = groups.find((group) => group.items.some((item) => isActive(item.href)));
  const current = currentGroup?.items.find((item) => isActive(item.href));
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderAlerts, setOrderAlerts] = useState(0);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onAlerts(event: Event) {
      setOrderAlerts(Number((event as CustomEvent<{ count?: number }>).detail?.count || 0));
    }
    window.addEventListener("dz-order-alerts", onAlerts);
    return () => window.removeEventListener("dz-order-alerts", onAlerts);
  }, []);

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Management">
        <div className="admin-brand">
          <div className="admin-brand-row">
            <span className="admin-mark">DZ</span>
            <div>
              <p className="admin-brand-name">Double Zero</p>
              <p className="admin-brand-sub">Operations</p>
            </div>
            <MenuBurger open={menuOpen} onClick={() => setMenuOpen((v) => !v)} className="admin-burger" />
          </div>
          <BranchSwitch branch={branch} />
        </div>
        <div className="admin-menu">
          <nav className="admin-nav">
            {groups.map((group) => (
              <div key={group.label} className="admin-nav-group">
                <p className="admin-nav-label">{group.label}</p>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`admin-nav-link ${active ? "is-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <NavIcon name={item.icon} />
                      <span>{item.label}</span>
                      {item.href === "/admin/orders" && orderAlerts ? <em className="admin-nav-alert">{orderAlerts}</em> : null}
                      {"global" in item && item.global ? <em className="admin-nav-both">Both</em> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="admin-sidebar-foot">
            <span className="admin-avatar" aria-hidden="true">
              {staffName.slice(0, 1).toUpperCase()}
            </span>
            <div className="admin-staff">
              <p>{staffName}</p>
              <p>{staffRole}</p>
            </div>
            <form action="/api/admin/logout" method="post">
              <button className="admin-signout" type="submit" title="Sign out" aria-label="Sign out">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <p className="admin-crumbs">
              <span>{loc.shortName}</span>
              {currentGroup ? (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{currentGroup.label}</span>
                </>
              ) : null}
            </p>
            <p className="admin-topbar-title">{current?.label || "Dashboard"}</p>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-live" title="Orders refresh automatically">
              <i aria-hidden="true" />
              Live
            </span>
            <p className="admin-topbar-date">
              {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </p>
            <Link href="/" target="_blank" rel="noreferrer" className="admin-top-btn is-ghost">
              View site
            </Link>
            {pathname.startsWith("/admin/bookings") ? null : (
              <Link href="/admin/bookings" className="admin-top-btn">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 3v2M17 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                </svg>
                Open diary
              </Link>
            )}
          </div>
        </header>
        <div className="admin-content">
          {children}
          <OrderWatch />
          <AdminToast />
        </div>
      </div>
    </div>
  );
}
