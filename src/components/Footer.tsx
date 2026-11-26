import Link from "next/link";
import { brand, locations } from "@/data/site";

export function Footer() {
  const city = locations.manchester;
  const chorlton = locations.chorlton;

  return (
    <footer className="dz-end">
      <div className="dz-end-grid">
        <div className="dz-end-brand">
          <p className="dz-end-name">Double Zero</p>
          <p className="dz-end-tag">{brand.tagline}</p>
          <p className="dz-end-info">
            Dough from four ingredients, fermented for 48 hours, then cooked in 90 seconds in a Naples-built wood oven.
            City Centre and Chorlton.
          </p>
        </div>

        <div className="dz-end-rooms">
          <div>
            <p className="dz-end-label">City Centre</p>
            <p>
              {city.address}, {city.postcode}
            </p>
            <a href={city.phoneHref}>{city.phone}</a>
            <a href={`mailto:${city.email}`}>{city.email}</a>
          </div>
          <div>
            <p className="dz-end-label">Chorlton</p>
            <p>
              {chorlton.address}, {chorlton.postcode}
            </p>
            <a href={chorlton.phoneHref}>{chorlton.phone}</a>
            <a href={`mailto:${chorlton.email}`}>{chorlton.email}</a>
          </div>
        </div>

        <div>
          <p className="dz-end-label">Site</p>
          <nav className="dz-end-links" aria-label="Footer">
            <Link href="/menu">Menu</Link>
            <Link href="/about">Our story</Link>
            <Link href="/gallery">Gallery</Link>
            <Link href="/offers">Offers</Link>
            <Link href="/account">Account</Link>
            <Link href="/contact">Contact</Link>
            <a href={brand.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
      </div>

      <p className="dz-end-legal">© {new Date().getFullYear()} {brand.legalName}</p>
    </footer>
  );
}
