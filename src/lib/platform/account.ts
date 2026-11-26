import type { Customer } from "@prisma/client";
import { db } from "@/lib/db";
import { publicCustomer } from "@/lib/platform/customer-access";
import type { Serialized } from "@/types/serialized";

/**
 * Everything the customer account page shows: bookings, orders, enquiries,
 * waitlist entries and live offers. Records made with the customer's email
 * before they had an account are linked to it first.
 */
export async function getAccountOverview(customer: Customer) {
  const link = { where: { email: customer.email, customerId: null }, data: { customerId: customer.id } };
  await db.booking.updateMany(link);
  await db.order.updateMany(link);
  await db.enquiry.updateMany(link);
  await db.waitlistEntry.updateMany(link);

  const [bookings, orders, enquiries, waitlist, offers] = await Promise.all([
    db.booking.findMany({
      where: { customerId: customer.id },
      include: { party: true, payments: { include: { refunds: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.order.findMany({
      where: { customerId: customer.id },
      include: { items: true, delivery: true, payments: { include: { refunds: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.enquiry.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" } }),
    db.waitlistEntry.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" } }),
    db.offer.findMany({ where: { active: true } }),
  ]);

  return { customer: publicCustomer(customer), bookings, orders, enquiries, waitlist, offers };
}

/** JSON returned by GET /api/account for a signed-in customer. */
export type AccountOverview = Serialized<Awaited<ReturnType<typeof getAccountOverview>>>;
export type AccountBooking = AccountOverview["bookings"][number];
export type AccountOrder = AccountOverview["orders"][number];
