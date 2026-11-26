import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { signToken, verifyToken } from "@/lib/platform/signed-token";
import type { LocationId } from "@/data/site";

const CUSTOMER = "dz-customer";
const STAFF = "dz-staff";
const LOCATION = "dz-location";
const BRANCH = "dz-branch";

const CUSTOMER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const STAFF_MAX_AGE = 60 * 60 * 12; // 12 hours
const secure = process.env.NODE_ENV === "production";

export async function getCustomer() {
  const jar = await cookies();
  const id = verifyToken(jar.get(CUSTOMER)?.value);
  if (!id) return null;
  return db.customer.findUnique({ where: { id } });
}

export async function setCustomerCookie(id: string) {
  const jar = await cookies();
  jar.set(CUSTOMER, signToken(id, CUSTOMER_MAX_AGE), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: CUSTOMER_MAX_AGE });
}

export async function clearCustomerCookie() {
  const jar = await cookies();
  jar.delete(CUSTOMER);
}

export async function getStaff() {
  const jar = await cookies();
  const id = verifyToken(jar.get(STAFF)?.value);
  if (!id) return null;
  return db.staffUser.findUnique({ where: { id } });
}

export async function setStaffCookie(id: string) {
  const jar = await cookies();
  jar.set(STAFF, signToken(id, STAFF_MAX_AGE), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: STAFF_MAX_AGE });
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
