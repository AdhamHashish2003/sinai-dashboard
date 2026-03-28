import { PrismaClient } from "@prisma/client";
import { validateEnv } from "./env";

// Validate env on first import (server-side only)
if (typeof window === "undefined") {
  validateEnv();
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
