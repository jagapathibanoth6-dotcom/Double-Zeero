import { db } from "@/lib/db";
import { notify } from "@/lib/platform/notify";
import { generateTempPassword, hashPassword } from "@/lib/platform/password";

export async function issueCustomerAccess(input: { email: string; name: string; phone?: string }) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.customer.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    const customer = await db.customer.update({
      where: { id: existing.id },
      data: {
        name: input.name || existing.name,
        phone: input.phone || existing.phone,
      },
    });
    return { customer, tempPassword: null as string | null, isNew: false };
  }

  const tempPassword = generateTempPassword();
  const customer = existing
    ? await db.customer.update({
        where: { id: existing.id },
        data: {
          name: input.name || existing.name,
          phone: input.phone || existing.phone,
          passwordHash: hashPassword(tempPassword),
          mustChangePassword: true,
        },
      })
    : await db.customer.create({
        data: {
          email,
          name: input.name.trim(),
          phone: input.phone?.trim() || "",
          passwordHash: hashPassword(tempPassword),
          mustChangePassword: true,
        },
      });

  return { customer, tempPassword, isNew: true };
}

export async function sendAccessEmail(input: {
  to: string;
  title: string;
  details: Record<string, string>;
  tempPassword?: string | null;
  intro?: string;
}) {
  const lines = Object.entries(input.details)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const passwordLine = input.tempPassword
    ? `\n\nYour temporary login password: ${input.tempPassword}\nSign in at Account on the Double Zero website with this email and password.`
    : `\n\nSign in at Account on the Double Zero website with your existing password to manage this.`;
  return notify("email", "customer_access", input.to, {
    title: input.title,
    intro:
      input.intro ||
      "This is your confirmation. Keep it for your records. Sign in at Account to manage the booking, click & collect, home delivery or party menu.",
    details: input.details,
    tempPassword: input.tempPassword || "",
    ctaHref: "/account",
    ctaLabel: "Open my dashboard",
    body: `${input.title}\n\n${lines}${passwordLine}`,
  });
}

export function publicCustomer(customer: { id: string; email: string; name: string; phone: string; mustChangePassword: boolean }) {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    mustChangePassword: customer.mustChangePassword,
  };
}
