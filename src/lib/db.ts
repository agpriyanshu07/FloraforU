import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  (process.env.FFU_LOG_QUERIES
    ? new PrismaClient({ log: [{ emit: "stdout", level: "query" }] })
    : new PrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
