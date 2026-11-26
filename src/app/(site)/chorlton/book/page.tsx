import type { Metadata } from "next";
import { BookingDesk } from "@/components/BookingDesk";

export const metadata: Metadata = {
  title: "Book Chorlton",
  description: "Reserve a table or collection slot at Double Zero Chorlton.",
};

export default function ChorltonBookPage() {
  return <BookingDesk locationId="chorlton" />;
}
