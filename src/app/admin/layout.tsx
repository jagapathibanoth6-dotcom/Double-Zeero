import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getStaff, getStaffBranch } from "@/lib/platform/session";

export const metadata: Metadata = {
  title: {
    default: "Management",
    template: "%s | Double Zero Management",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();

  if (!staff) {
    return <div className="admin-login-screen">{children}</div>;
  }

  const branch = await getStaffBranch();

  return (
    <AdminShell staffName={staff.name} staffRole={staff.role} branch={branch}>
      {children}
    </AdminShell>
  );
}
