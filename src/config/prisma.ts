import "../utils/env";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

declare global {
  // 防止开发环境下多次new PrismaClient报错
  // 因为 globalThis 可以在多次热重载中保留同一个实例
  // 这段声明是告诉TS全局变量类型
  // 避免 "Cannot redeclare block-scoped variable" 错误
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize PrismaClient");
  }

  return new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
    log: ["error"],
  });
};

export const prisma: PrismaClient = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
