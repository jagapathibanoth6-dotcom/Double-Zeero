"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MobileDock } from "@/components/MobileDock";
import { locations, type LocationId } from "@/data/site";

function activeLocation(pathname: string): LocationId | null {
  if (pathname.startsWith("/manchester") || pathname.startsWith("/book/manchester")) return "manchester";
  if (pathname.startsWith("/chorlton") || pathname.startsWith("/book/chorlton")) return "chorlton";
  return null;
}

const bookChoices = [
  {
    loc: locations.manchester,
    title: "City Centre",
    meta: "Lunch through late evening · full bar",
  },
  {
    loc: locations.chorlton,
    title: "Chorlton",
    meta: "Evening room · BYOB · collection",
  },
];

export function Header() {
  const pathname = usePathname();
  const [bookOpen, setBookOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [slim, setSlim] = useState(false);
  const lastY = useRef(0);
  const bookRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const home = pathname === "/";
  const current = activeLocation(pathname);

  const links = [
    { href: "/", label: "Home" },
    { href: current ? locations[current].menuPath : "/menu", label: "Menu" },
    { href: current ? locations[current].bookingPath : "/book", label: "Book a Table" },
    { href: "/order/collect?via=Website", label: "Click & collect" },
    { href: "/locations", label: "Locations" },
    { href: "/about", label: "About" },
    { href: "/offers", label: "Offers" },
    { href: current ? `/${current}#contact` : "/contact", label: "Contact" },
    { href: "/account", label: "Account" },
  ];

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.max(0, window.scrollY);
        const delta = y - lastY.current;
        setScrolled(y > 24);
        if (menuRef.current?.open || y < 10) {
          setSlim(false);
        } else if (delta > 8) {
          setSlim(true);
        } else if (delta < -8) {
          setSlim(false);
        }
        lastY.current = y;
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setBookOpen(false);
    setMenuOpen(false);
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && menuRef.current) {
        menuRef.current.open = false;
        setMenuOpen(false);
        menuRef.current.querySelector<HTMLElement>("summary")?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!bookOpen) return;
    function onPointer(e: MouseEvent) {
      if (!bookRef.current?.contains(e.target as Node)) setBookOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setBookOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [bookOpen]);

  const solid = !home || scrolled;

  return (
    <header
      className={`site-header ${solid ? "is-solid" : ""} ${slim ? "is-slim" : ""}`}
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: "auto", zIndex: 40 }}
    >
      <div className="site-bar">
        <Link href="/" className="min-w-0 transition-opacity hover:opacity-80" aria-label="Double Zero home">
          <span className="wordmark block text-[1.05rem] md:text-[1.15rem]">Double Zero</span>
          <span className="wordmark-sub mt-1 hidden text-gold sm:block">Sourdough wood oven pizzeria</span>
        </Link>

        <nav className="site-desktop-nav">
          {links
            .filter((link) => link.label !== "Account")
            .map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : link.label === "Menu"
                    ? pathname.endsWith("/menu") || pathname === "/menu"
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  className={`display text-[0.68rem] tracking-[0.22em] transition-colors hover:text-gold ${
                    active ? "text-gold" : "text-cream/90"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/account" className="display hidden text-[0.72rem] tracking-[0.18em] text-cream transition-colors hover:text-gold lg:inline">
            Account
          </Link>
          {current ? (
            <Link href={locations[current].bookingPath} className="btn btn-ember site-desk-cta">
              Book a table
            </Link>
          ) : (
            <div className="relative site-desk-cta" ref={bookRef}>
              <button type="button" className="btn btn-ember" aria-expanded={bookOpen} onClick={() => setBookOpen((v) => !v)}>
                Book
              </button>
              {bookOpen ? (
                <div className="site-card absolute right-0 mt-3 w-[22.5rem] p-3 text-ink">
                  <p className="display px-1 pb-3 text-[0.62rem] tracking-[0.28em] text-mute">Choose a restaurant</p>
                  <div className="grid gap-2">
                    {bookChoices.map(({ loc, title, meta }) => (
                      <Link key={loc.id} href={loc.bookingPath} className="book-choice">
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <span className="serif block text-xl leading-tight">{title}</span>
                            <span className="mt-1 block text-sm text-mute">
                              {loc.address} · {loc.postcode}
                            </span>
                            <span className="mt-2 block text-xs text-mute">{meta}</span>
                          </span>
                          <span className="display mt-1 shrink-0 text-[0.62rem] tracking-[0.16em] text-ember">Book →</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <details ref={menuRef} className="site-nav" onToggle={(event) => setMenuOpen(event.currentTarget.open)}>
            <summary className="nav-lines" aria-label={menuOpen ? "Close menu" : "Open menu"}>
              <svg viewBox="0 0 24 16" width="24" height="16" fill="none" aria-hidden="true">
                <path d="M1 1.5h22" stroke="#fff8ef" strokeWidth="2" strokeLinecap="square" />
                <path d="M1 8h22" stroke="#fff8ef" strokeWidth="2" strokeLinecap="square" />
                <path d="M1 14.5h22" stroke="#fff8ef" strokeWidth="2" strokeLinecap="square" />
              </svg>
            </summary>
            <button
              type="button"
              className="site-drawer-mask"
              aria-label="Close menu"
              onClick={() => {
                if (menuRef.current) menuRef.current.open = false;
                setMenuOpen(false);
              }}
            />
            <div className="site-drawer">
              <nav className="site-menu-nav">
                {links.map((link) => (
                  <a key={`${link.label}-${link.href}`} href={link.href} className="site-menu-link">
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </details>
        </div>
      </div>
      <MobileDock />
    </header>
  );
}
