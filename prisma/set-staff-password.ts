/**
 * Create a staff account or reset its password.
 *
 *   npm run staff:password -- <email> <new-password> [name] [role]
 *
 * role is "owner" or "kitchen" (default "owner" for new accounts).
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/platform/password";

const db = new PrismaClient();

async function main() {
  const [emailArg, password, name = "Staff", role = "owner"] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!email || !password) {
    console.error("Usage: npm run staff:password -- <email> <new-password> [name] [role]");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Use a password of at least 10 characters.");
    process.exit(1);
  }
  const hash = hashPassword(password);
  const staff = await db.staffUser.upsert({
    where: { email },
    update: { password: hash },
    create: { email, name, role, password: hash },
  });
  console.log(`Password set for ${staff.email} (${staff.role}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
