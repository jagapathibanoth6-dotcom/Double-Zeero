import type { Metadata } from "next";
import { BookingDesk } from "@/components/BookingDesk";

export const metadata: Metadata = {
  title: "Book Manchester City Centre",
  description: "Reserve a table at Double Zero, 55 Spring Gardens, Manchester.",
};

export default function ManchesterBookPage() {
  return <BookingDesk locationId="manchester" />;
}
