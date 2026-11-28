import { redirect } from "next/navigation";

/** Online ordering is click & collect only, so /order goes straight there. */
export default async function OrderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const query = params.toString();
  redirect(`/order/collect${query ? `?${query}` : ""}`);
}
