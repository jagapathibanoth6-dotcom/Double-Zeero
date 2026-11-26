import { OrdersScreen } from "../orders/OrdersScreen";

export const dynamic = "force-dynamic";

export default async function AdminCollect({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  return <OrdersScreen kind="CLICK_COLLECT" dateParam={params.date} />;
}
