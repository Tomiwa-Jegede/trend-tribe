// src/db.js — Prisma Client Singleton

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"], // logs all DB activity in dev
});

module.exports = prisma;
