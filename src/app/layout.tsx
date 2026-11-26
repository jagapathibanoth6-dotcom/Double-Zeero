import type { Metadata, Viewport } from "next";
import { Outfit, Oswald, Instrument_Serif, Syne } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-syne",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://pizzeriadoublezero.com"),
  title: {
    default: "Double Zero | Neapolitan pizza in Manchester",
    template: "%s | Double Zero",
  },
  description:
    "Independent Neapolitan pizzeria in Manchester City Centre and Chorlton. Handmade dough, 48-hour ferment, wood-fired in a Stefano Ferrara oven from Naples.",
  openGraph: {
    title: "Double Zero | Neapolitan pizza in Manchester",
    description: "The home of independent, authentic, handmade Neapolitan pizza. Two Manchester locations.",
    type: "website",
    locale: "en_GB",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className={`${outfit.variable} ${oswald.variable} ${instrument.variable} ${syne.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
