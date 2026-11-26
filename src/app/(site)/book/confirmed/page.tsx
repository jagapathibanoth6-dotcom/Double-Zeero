import { Suspense } from "react";
import type { Metadata } from "next";
import { ConfirmedClient } from "./ConfirmedClient";

export const metadata: Metadata = {
  title: "Booking confirmed",
  description: "Your Double Zero table or collection booking.",
};

export default function ConfirmedPage() {
  return (
    <Suspense fallback={<div className="px-5 py-32 text-center text-mute">Loading booking…</div>}>
      <ConfirmedClient />
    </Suspense>
  );
}
