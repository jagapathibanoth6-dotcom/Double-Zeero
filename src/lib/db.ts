import path from "node:path";
import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma client.
 *
 * In development Next.js reloads modules on every change, so the client is
 * cached on `globalThis` to avoid opening a new database connection each time.
 * A cached client is replaced if it was created before the latest
 * `prisma generate` (it would be missing newer models).
 */

/** SQLite paths like `file:./dev.db` are resolved from the prisma/ folder, the same way the Prisma CLI does. */
function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "");
  if (!url) return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
  if (url.startsWith("file:./")) return `file:${path.join(process.cwd(), "prisma", url.slice("file:./".length))}`;
  return url;
}

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: databaseUrl() } },
  });
}

function hasLatestModels(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(client && typeof (client as unknown as { qrCode?: { findMany?: unknown } }).qrCode?.findMany === "function");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?: string };
const url = databaseUrl();

if (globalForPrisma.prisma && (globalForPrisma.prismaUrl !== url || !hasLatestModels(globalForPrisma.prisma))) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const db: PrismaClient = hasLatestModels(globalForPrisma.prisma) ? globalForPrisma.prisma : createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaUrl = url;
}
