import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { locations, type LocationId } from "@/data/site";
import { getStaff, getStaffBranch } from "@/lib/platform/session";

export function revalidateHouse() {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/kitchen");
  revalidatePath("/account");
}

export async function requireStaff() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

export async function requireBranch() {
  await requireStaff();
  return getStaffBranch();
}

export function branchName(locationId: string) {
  return locations[locationId as LocationId]?.shortName || locationId;
}

export async function requireBranchRecord(locationId: string) {
  const branch = await requireBranch();
  if (locationId !== branch) notFound();
  return branch;
}

export async function assertStaffBranch(locationId: string) {
  const branch = await getStaffBranch();
  if (locationId !== branch) {
    throw new Error("This belongs to the other restaurant. Switch branch first.");
  }
  return branch;
}
