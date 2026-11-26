import type { Metadata } from "next";
import { AccountDesk } from "@/components/AccountDesk";

export const metadata: Metadata = { title: "Account" };

export default function LoginPage() {
  return <AccountDesk />;
}
