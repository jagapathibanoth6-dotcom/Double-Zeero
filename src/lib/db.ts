import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?: string };

function databaseUrl() {
  return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
}

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: databaseUrl() } },
  });
}

function isFresh(client?: PrismaClient) {
  return Boolean(client && typeof (client as { qrCode?: { findMany?: unknown } }).qrCode?.findMany === "function");
}

const url = databaseUrl();
const cached = globalForPrisma.prisma;
if (cached && (globalForPrisma.prismaUrl !== url || !isFresh(cached))) {
  void cached.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const db = isFresh(globalForPrisma.prisma) ? globalForPrisma.prisma : createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaUrl = url;
}
