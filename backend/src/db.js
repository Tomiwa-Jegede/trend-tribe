// src/db.js — Prisma Client Singleton

const { PrismaClient } = require("@prisma/client");

const config = require("./config/env");
const prisma = new PrismaClient({
  log: config.isDev ? ["query", "info", "warn", "error"] : ["error"],
});

module.exports = prisma;
