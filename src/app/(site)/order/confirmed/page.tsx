import { Suspense } from "react";
import type { Metadata } from "next";
import { OrderConfirmed } from "@/components/OrderConfirmed";

export const metadata: Metadata = { title: "Order confirmed" };

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={<div className="px-5 py-32 text-center text-mute">Loading order…</div>}>
      <OrderConfirmed />
    </Suspense>
  );
}
