import { db } from "@/lib/db";
import { locations, type LocationId, type VisitType } from "@/data/site";
import { generateSlots, londonParts, todayISO, toMinutes } from "@/lib/booking";
import { hoursFromSettings } from "@/lib/platform/hours";
import { durationForGuests, formatMoney, randomCode, uniqueRef } from "@/lib/platform/money";
import type { MailBundle } from "@/lib/platform/mail-events";
import { notify, partyReminderText } from "@/lib/platform/notify";
import { charge } from "@/lib/platform/payments";
import { bookingBand, getSettings, sittingCap } from "@/lib/platform/settings";
import { issueCustomerAccess, sendAccessEmail } from "@/lib/platform/customer-access";
import { generateTempPassword, hashPassword } from "@/lib/platform/password";

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function packTables(
  tables: Array<{ code: string; seats: number }>,
  combos: Array<{ codes: string; seats: number }>,
  taken: Set<string>,
  guests: number,
) {
  if (guests <= 0) return [];
  const free = tables.filter((table) => !taken.has(table.code)).sort((a, b) => b.seats - a.seats);
  const single = free.find((table) => table.seats >= guests);
  if (single) return [single.code];
  const combo = combos.find((row) => {
    const codes = codesOfTable(row.codes);
    return row.seats >= guests && codes.every((code) => !taken.has(code));
  });
  if (combo) return codesOfTable(combo.codes);
  const picked: string[] = [];
  let seats = 0;
  for (const table of free) {
    picked.push(table.code);
    seats += table.seats;
    if (seats >= guests) return picked;
  }
  return [];
}

function seatsLeft(tables: Array<{ code: string; seats: number }>, taken: Set<string>) {
  return tables.filter((table) => !taken.has(table.code)).reduce((sum, table) => sum + table.seats, 0);
}

export function codesOfTable(value: string) {
  return value.split(",").map((code) => code.trim()).filter(Boolean);
}

export async function guestsOnTables(locationId: string, codes: string[]) {
  const wanted = new Set(codes.map((code) => code.trim()).filter(Boolean));
  if (!wanted.size) return [];
  const bookings = await db.booking.findMany({
    where: {
      locationId,
      date: { gte: todayISO() },
      visitType: { not: "collection" },
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
    select: { name: true, date: true, time: true, guests: true, tableCodes: true, status: true },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  return bookings.filter((booking) => codesOfTable(booking.tableCodes).some((code) => wanted.has(code)));
}

export async function searchSlots(input: {
  locationId: LocationId;
  date: string;
  guests: number;
  visitType: VisitType;
}) {
  const settings = await getSettings(input.locationId);
  const band = bookingBand(input.guests, settings);
  const hours = hoursFromSettings(input.locationId, settings, input.visitType, input.date);
  const all = generateSlots(input.locationId, input.date, input.visitType, hours);

  if (input.visitType === "collection") {
    const orders = await db.order.findMany({
      where: { locationId: input.locationId, date: input.date, source: { in: ["CLICK_COLLECT", "WEBSITE"] } },
    });
    return {
      band,
      settings,
      slots: all.map((time) => {
        const used = orders.filter((o) => o.time === time).length;
        return { time, available: used < settings.collectionMaxPerSlot, tables: [] as string[], used, cap: settings.collectionMaxPerSlot };
      }),
    };
  }

  const duration = durationForGuests();
  const occupy = duration + settings.turnaroundMinutes;
  const bookings = await db.booking.findMany({
    where: {
      locationId: input.locationId,
      date: input.date,
      visitType: "table",
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
  });
  const tables = await db.table.findMany({ where: { locationId: input.locationId, active: true } });
  const combos = await db.tableCombo.findMany({ where: { locationId: input.locationId } });

  const cap = sittingCap(settings);

  return {
    band,
    settings,
    duration,
    slots: all.map((time) => {
      const start = toMinutes(time);
      const end = start + occupy;
      const taken = new Set<string>();
      let used = 0;
      const sitting = bookings.filter((booking) => {
        const bStart = toMinutes(booking.time);
        const bEnd = bStart + booking.durationMin + settings.turnaroundMinutes;
        return overlaps(start, end, bStart, bEnd);
      });
      for (const booking of sitting) {
        used += booking.guests;
        codesOfTable(booking.tableCodes).forEach((code) => taken.add(code));
      }
      for (const booking of sitting) {
        if (codesOfTable(booking.tableCodes).length) continue;
        packTables(tables, combos, taken, booking.guests).forEach((code) => taken.add(code));
      }
      const assignment = packTables(tables, combos, taken, input.guests);
      const roomLeft = used + input.guests <= cap;
      const tablesLeft = seatsLeft(tables, taken);
      return {
        time,
        available: roomLeft && assignment.length > 0 && tablesLeft >= input.guests,
        tables: assignment,
        used,
        cap,
        freeSeats: tablesLeft,
      };
    }),
  };
}

async function sendBookingConfirmedMail(input: {
  booking: {
    ref: string;
    locationId: string;
    visitType: string;
    date: string;
    time: string;
    guests: number;
    name: string;
    email: string;
    phone: string;
    status: string;
  };
  depositPaidPence?: number;
  partyCode?: string | null;
  tempPassword?: string | null;
}) {
  if (!input.booking.email?.includes("@")) return { sent: false, error: "No customer email" };
  const loc = locations[input.booking.locationId as LocationId];
  const paid = input.depositPaidPence && input.depositPaidPence > 0;
  const details: Record<string, string> = {
    Reference: input.booking.ref,
    Restaurant: loc?.name || input.booking.locationId,
    Type: input.booking.visitType === "collection" ? "Collection" : "Book a table",
    Date: input.booking.date,
    Time: input.booking.time,
    Guests: String(input.booking.guests),
    Name: input.booking.name,
    Email: input.booking.email,
    Phone: input.booking.phone,
    Status: "Confirmed",
    Payment: paid ? `Deposit paid ${formatMoney(input.depositPaidPence || 0)}` : "No deposit",
  };
  if (input.partyCode) details["Party menu"] = `/party/${input.partyCode}`;
  return sendAccessEmail({
    to: input.booking.email,
    title: `Booking confirmed ${input.booking.ref}`,
    intro: paid
      ? `Your Double Zero table is booked. Stripe has taken the ${formatMoney(input.depositPaidPence || 0)} deposit. Keep this email as your receipt.${input.partyCode ? " The party menu link is in this email for your guests." : ""}`
      : "Your Double Zero table is booked. Keep this email as your confirmation.",
    details,
    tempPassword: input.tempPassword,
  });
}

export async function finalizePaidBooking(bookingId: string, paidPence: number) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { party: true, customer: true },
  });
  if (!booking || booking.status === "CANCELLED" || booking.status === "COMPLETED") return booking;
  if (booking.status !== "PENDING_DEPOSIT") return booking;
  await db.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
  let tempPassword: string | null = null;
  if (booking.customer?.mustChangePassword) {
    tempPassword = generateTempPassword();
    await db.customer.update({
      where: { id: booking.customer.id },
      data: { passwordHash: hashPassword(tempPassword), mustChangePassword: true },
    });
  }
  await sendBookingConfirmedMail({
    booking: { ...booking, status: "CONFIRMED" },
    depositPaidPence: paidPence,
    partyCode: booking.party?.code,
    tempPassword,
  });
  return db.booking.findUnique({ where: { id: booking.id }, include: { party: true } });
}

async function nextBookingRef() {
  return uniqueRef("B", async (ref) => Boolean(await db.booking.findUnique({ where: { ref }, select: { id: true } })));
}

async function nextEnquiryRef() {
  return uniqueRef("ENQ", async (ref) => Boolean(await db.enquiry.findUnique({ where: { ref }, select: { id: true } })));
}

export async function createBooking(input: {
  locationId: LocationId;
  date: string;
  time: string;
  guests: number;
  visitType: VisitType;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  highchair?: boolean;
  source?: string;
  payDeposit?: boolean;
  paymentMode?: string;
  force?: boolean;
  tableCodes?: string;
}) {
  const settings = await getSettings(input.locationId);
  const band = bookingBand(input.guests, settings);

  if (band === "ENQUIRY" && !input.force) {
    throw new Error("Parties of this size need a large-group enquiry.");
  }

  const search = await searchSlots(input);
  const slot = search.slots.find((s) => s.time === input.time);
  if (!input.force && !slot?.available) {
    throw new Error("That sitting is full.");
  }
  const assignedTables = input.tableCodes || slot?.tables.join(",") || "";

  const access = await issueCustomerAccess({ email: input.email, name: input.name, phone: input.phone });
  const customer = access.customer;
  const duration = durationForGuests();
  const large = band === "LARGE" || (input.force && input.guests >= settings.largeFrom);
  const needsDeposit = large && settings.depositEnabled && input.guests >= settings.depositFrom;
  const depositAmount =
    settings.depositType === "PER_PERSON" ? settings.depositAmountPence * input.guests : settings.depositAmountPence;
  const status = needsDeposit && !input.payDeposit ? "PENDING_DEPOSIT" : "CONFIRMED";

  const booking = await db.booking.create({
    data: {
      ref: await nextBookingRef(),
      locationId: input.locationId,
      date: input.date,
      time: input.time,
      guests: input.guests,
      durationMin: duration,
      visitType: input.visitType,
      status,
      source: input.source || "website",
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      notes: input.notes?.trim() || "",
      highchair: Boolean(input.highchair),
      tableCodes: assignedTables,
      customerId: customer.id,
    },
  });

  if (needsDeposit && input.payDeposit) {
    await charge({
      amountPence: depositAmount,
      kind: "DEPOSIT",
      bookingId: booking.id,
      to: booking.email,
      notify: false,
    });
    await db.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
  }

  let party = null;
  if (large && input.visitType === "table") {
    const deadline = new Date(`${input.date}T${input.time}:00`);
    deadline.setHours(deadline.getHours() - settings.preorderDeadlineHours);
    party = await db.party.create({
      data: {
        bookingId: booking.id,
        code: `DZ${randomCode(8)}`,
        paymentMode: input.paymentMode || "INDIVIDUAL",
        deadlineAt: deadline,
      },
    });
    await db.bookingGuest.create({
      data: { partyId: party.id, name: input.name.trim(), sortOrder: 0 },
    });
  }

  const saved = await db.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: { payments: { include: { refunds: true } } },
  });
  const mail: MailBundle = {};
  if (saved.status !== "PENDING_DEPOSIT") {
    mail.customer = await sendBookingConfirmedMail({
      booking: saved,
      depositPaidPence: needsDeposit && input.payDeposit ? depositAmount : 0,
      partyCode: party?.code,
      tempPassword: access.tempPassword,
    });
  }

  return {
    booking: saved,
    party,
    customer,
    access: { email: customer.email, tempPassword: access.tempPassword, isNew: access.isNew },
    mail,
    band,
    depositRequired: needsDeposit,
    depositAmountPence: needsDeposit ? depositAmount : 0,
    preorderRequired: band === "LARGE" && settings.preorderEnabled && input.guests >= settings.preorderFrom,
    reminderText: party
      ? partyReminderText({
          date: booking.date,
          time: booking.time,
          code: party.code,
        })
      : "",
    location: locations[input.locationId],
  };
}

export async function createEnquiry(input: {
  locationId: LocationId;
  date: string;
  preferredTime: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  occasion?: string;
  foodRequirements?: string;
  message?: string;
}) {
  const access = await issueCustomerAccess({ email: input.email, name: input.name, phone: input.phone });
  const customer = access.customer;
  const enquiry = await db.enquiry.create({
    data: {
      ref: await nextEnquiryRef(),
      locationId: input.locationId,
      date: input.date,
      preferredTime: input.preferredTime,
      guests: input.guests,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      occasion: input.occasion?.trim() || "",
      foodRequirements: input.foodRequirements?.trim() || "",
      message: input.message?.trim() || "",
      customerId: customer.id,
    },
  });
  const details = {
    Reference: enquiry.ref,
    Restaurant: locations[input.locationId].name,
    Date: enquiry.date,
    Time: enquiry.preferredTime,
    Guests: String(enquiry.guests),
    Name: enquiry.name,
    Email: enquiry.email,
    Phone: enquiry.phone,
    Status: enquiry.status,
  };
  const mail: MailBundle = {
    customer: await sendAccessEmail({
      to: enquiry.email,
      title: `Double Zero large-group enquiry ${enquiry.ref}`,
      intro: "We have your large-group request. The restaurant will confirm by email.",
      tempPassword: access.tempPassword,
      details,
    }),
  };
  return { enquiry, access: { email: customer.email, tempPassword: access.tempPassword, isNew: access.isNew }, mail };
}

export async function convertEnquiry(enquiryId: string, time: string, staffName: string) {
  const enquiry = await db.enquiry.findUnique({ where: { id: enquiryId } });
  if (!enquiry) throw new Error("Enquiry not found");
  const result = await createBooking({
    locationId: enquiry.locationId as LocationId,
    date: enquiry.date,
    time,
    guests: enquiry.guests,
    visitType: "table",
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    notes: [enquiry.occasion, enquiry.foodRequirements, enquiry.message].filter(Boolean).join(" — "),
    source: "enquiry",
    payDeposit: false,
    force: true,
  });
  await db.enquiry.update({
    where: { id: enquiry.id },
    data: { status: "CONVERTED", bookingId: result.booking.id },
  });
  await db.auditLog.create({
    data: { actor: staffName, action: "convert_enquiry", entity: "Enquiry", entityId: enquiry.id },
  });
  return result;
}

export async function joinWaitlist(input: {
  locationId: LocationId;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
}) {
  const settings = await getSettings(input.locationId);
  if (!settings.waitlistEnabled) throw new Error("Waiting list is closed.");
  const { customer } = await issueCustomerAccess({ email: input.email, name: input.name, phone: input.phone });
  const entry = await db.waitlistEntry.create({
    data: {
      locationId: input.locationId,
      date: input.date,
      time: input.time,
      guests: input.guests,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      customerId: customer.id,
    },
  });
  await notify("email", "waitlist_joined", entry.email, {
    title: "You're on the Double Zero waitlist",
    intro: "We'll email you if a table comes free.",
    details: {
      Restaurant: locations[input.locationId].name,
      Date: entry.date,
      Time: entry.time,
      Guests: String(entry.guests),
    },
  });
  return entry;
}

export async function offerWaitlist(id: string, staffName: string) {
  const entry = await db.waitlistEntry.update({
    where: { id },
    data: { status: "OFFERED" },
  });
  await notify("email", "waitlist_offered", entry.email, {
    title: "A table is ready at Double Zero",
    intro: "A table matching your waitlist request is available. Open the link to confirm.",
    details: {
      Date: entry.date,
      Time: entry.time,
      Guests: String(entry.guests),
    },
    ctaHref: `/waitlist/${entry.id}`,
    ctaLabel: "Confirm this table",
  });
  await db.auditLog.create({ data: { actor: staffName, action: "waitlist_offered", entity: "Waitlist", entityId: entry.id } });
  return entry;
}

export async function bookWaitlist(id: string, staffName: string, time?: string) {
  const entry = await db.waitlistEntry.findUnique({ where: { id } });
  if (!entry) throw new Error("Waitlist entry not found.");
  const result = await createBooking({
    locationId: entry.locationId as LocationId,
    date: entry.date,
    time: time || entry.time,
    guests: entry.guests,
    visitType: "table",
    name: entry.name,
    email: entry.email,
    phone: entry.phone,
    source: "waitlist",
    force: true,
  });
  await db.waitlistEntry.update({ where: { id: entry.id }, data: { status: "BOOKED" } });
  await db.auditLog.create({ data: { actor: staffName, action: "waitlist_booked", entity: "Waitlist", entityId: entry.id } });
  return result;
}

export async function createWalkIn(input: {
  locationId: LocationId;
  date: string;
  time: string;
  guests: number;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  tableCodes?: string;
}) {
  if (!input.time) throw new Error("Choose a walk-in time.");
  const settings = await getSettings(input.locationId);
  const guests = Math.max(1, Number(input.guests || 2));
  const duration = durationForGuests();
  const search = await searchSlots({
    locationId: input.locationId,
    date: input.date,
    guests,
    visitType: "table",
  });
  const slot = search.slots.find((row) => row.time === input.time);
  if ((slot?.used || 0) + guests > (slot?.cap || sittingCap(settings))) {
    throw new Error("That sitting is full.");
  }
  let tableCodes = String(input.tableCodes || "").trim();
  if (!tableCodes && slot && "tables" in slot && Array.isArray(slot.tables)) {
    tableCodes = slot.tables.join(",");
  }

  const email = String(input.email || "").trim().toLowerCase();
  const name = String(input.name || "Walk-in").trim() || "Walk-in";
  const phone = String(input.phone || "").trim();
  const customer = email ? (await issueCustomerAccess({ email, name, phone })).customer : null;
  const now = londonParts();
  const isLive = input.date === todayISO() && toMinutes(input.time) <= toMinutes(`${now.hour}:${now.minute}`) + 30;

  return db.booking.create({
    data: {
      ref: await nextBookingRef(),
      locationId: input.locationId,
      date: input.date,
      time: input.time,
      guests,
      durationMin: duration,
      visitType: "table",
      status: isLive ? "SEATED" : "CONFIRMED",
      source: "walk-in",
      name,
      email,
      phone,
      notes: String(input.notes || "").trim(),
      tableCodes,
      customerId: customer?.id,
    },
  });
}
