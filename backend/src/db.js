// src/db.js — Prisma Client Singleton

const { PrismaClient } = require("@prisma/client");

const config = require("./config/env");
const prismaBase = new PrismaClient({
  log: config.isDev ? ["query", "info", "warn", "error"] : ["error"],
});

// Invalidate in-memory auth cache on any user mutation (covers profile, ban, role/seller status, email verify, payments, referrals, admin actions)
let cacheUtils = null;
function getCache() {
  if (!cacheUtils) {
    try {
      cacheUtils = require("./utils/cache");
    } catch {
      cacheUtils = null;
    }
  }
  return cacheUtils;
}

const prisma = prismaBase.$extends({
  query: {
    user: {
      async update({ args, query }) {
        const result = await query(args);
        try {
          const c = getCache();
          if (c) {
            const id = result?.id || args.where?.id;
            if (id) c.memDel(`auth:user:${id}`);
            // also clear if where id differs
            if (args.where?.id && result?.id && args.where.id !== result.id) c.memDel(`auth:user:${args.where.id}`);
          }
        } catch {}
        return result;
      },
      async updateMany({ args, query }) {
        const result = await query(args);
        try {
          const c = getCache();
          if (c && result?.count > 0) {
            // we don't know which ids, so flush all auth:user:* keys (small LRU)
            for (const k of [...c._memStore.keys()]) {
              if (k.startsWith("auth:user:")) c._memStore.delete(k);
            }
          }
        } catch {}
        return result;
      },
      async upsert({ args, query }) {
        const result = await query(args);
        try {
          const c = getCache();
          if (c && result?.id) c.memDel(`auth:user:${result.id}`);
        } catch {}
        return result;
      },
      async create({ args, query }) {
        const result = await query(args);
        // new user, no cache to invalidate
        return result;
      },
    },
  },
});

module.exports = prisma;
