import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { getStaff } from "@/lib/platform/session";

export default async function AdminLoginPage() {
  const staff = await getStaff();
  if (staff) redirect("/admin");
  return <AdminLogin />;
}
