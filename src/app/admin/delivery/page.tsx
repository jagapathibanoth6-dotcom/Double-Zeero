import { OrdersScreen } from "../orders/OrdersScreen";

export const dynamic = "force-dynamic";

export default async function AdminDelivery({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  return <OrdersScreen kind="DZ_DELIVERY" dateParam={params.date} />;
}
