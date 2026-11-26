import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { LocationId } from "@/data/site";

const CUSTOMER = "dz-customer";
const STAFF = "dz-staff";
const LOCATION = "dz-location";
const BRANCH = "dz-branch";

export async function getCustomer() {
  const jar = await cookies();
  const id = jar.get(CUSTOMER)?.value;
  if (!id) return null;
  return db.customer.findUnique({ where: { id } });
}

export async function setCustomerCookie(id: string) {
  const jar = await cookies();
  jar.set(CUSTOMER, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearCustomerCookie() {
  const jar = await cookies();
  jar.delete(CUSTOMER);
}

export async function getStaff() {
  const jar = await cookies();
  const id = jar.get(STAFF)?.value;
  if (!id) return null;
  return db.staffUser.findUnique({ where: { id } });
}

export async function setStaffCookie(id: string) {
  const jar = await cookies();
  jar.set(STAFF, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
}

export async function clearStaffCookie() {
  const jar = await cookies();
  jar.delete(STAFF);
}

export async function getPreferredLocation(): Promise<LocationId | null> {
  const jar = await cookies();
  const value = jar.get(LOCATION)?.value;
  if (value === "manchester" || value === "chorlton") return value;
  return null;
}

export async function setPreferredLocation(locationId: LocationId) {
  const jar = await cookies();
  jar.set(LOCATION, locationId, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
}

export async function getStaffBranch(): Promise<LocationId> {
  const jar = await cookies();
  const value = jar.get(BRANCH)?.value;
  if (value === "manchester" || value === "chorlton") return value;
  return "manchester";
}

export async function setStaffBranch(locationId: LocationId) {
  const jar = await cookies();
  jar.set(BRANCH, locationId, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180 });
}

export async function upsertCustomer(input: { email: string; name: string; phone?: string }) {
  const { issueCustomerAccess } = await import("@/lib/platform/customer-access");
  const { customer } = await issueCustomerAccess(input);
  return customer;
}
