// src/utils/cache.js — Upstash Redis small cache helper (free-tier budget)
// FREE plan: 500K/month ~16K/day, 256MB. Every command must earn its place.
const crypto = require("crypto");

let RedisClient = null;
try {
  const { Redis } = require("@upstash/redis");
  RedisClient = Redis;
} catch {
  // not installed or disabled
}

const PREFIX = "tt:";
const DAILY_BUDGET = 14000;
const BREAKER_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 800;

// --- in-memory LRU for memWrap (zero Redis commands) ---
const memStore = new Map(); // key -> { value, expiresAt }
const MEM_MAX = 500;
function memGet(key) {
  const e = memStore.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) {
    memStore.delete(key);
    return undefined;
  }
  return e.value;
}
function memSet(key, value, ttlMs) {
  if (memStore.size >= MEM_MAX) {
    const first = memStore.keys().next().value;
    memStore.delete(first);
  }
  memStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}
function memDel(key) {
  memStore.delete(key);
}
async function memWrap(key, ttlMs, fn) {
  const hit = memGet(key);
  if (hit !== undefined) return hit;
  const val = await fn();
  memSet(key, val, ttlMs);
  return val;
}

// --- Redis client ---
let redis = null;
if (RedisClient && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new RedisClient({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    console.warn("[CACHE] Redis init failed:", e.message);
    redis = null;
  }
}

// --- budget + circuit breaker ---
let dailyCount = 0;
let currentDay = new Date().toISOString().slice(0, 10);
let consecutiveFailures = 0;
let breakerOpenUntil = 0;

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}
function checkBudget() {
  const d = utcDay();
  if (d !== currentDay) {
    currentDay = d;
    dailyCount = 0;
  }
  return dailyCount < DAILY_BUDGET;
}
function incBudget() {
  dailyCount++;
}
function isBreakerOpen() {
  return Date.now() < breakerOpenUntil;
}
function recordSuccess() {
  consecutiveFailures = 0;
}
function recordFailure(err) {
  consecutiveFailures++;
  const msg = String(err?.message || err || "").toLowerCase();
  const isQuotaOrAuth =
    msg.includes("quota") ||
    msg.includes("limit exceeded") ||
    msg.includes("max commands") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden") ||
    msg.includes("invalid token") ||
    msg.includes("authentication") ||
    err?.status === 401 ||
    err?.status === 403 ||
    err?.status === 429;
  if (isQuotaOrAuth || consecutiveFailures >= 3) {
    breakerOpenUntil = Date.now() + BREAKER_MS;
    if (isQuotaOrAuth) console.warn("[CACHE] breaker open (quota/auth):", msg.slice(0, 120));
    else console.warn("[CACHE] breaker open (3 failures)");
  }
}
function canUseRedis() {
  if (!redis) return false;
  if (isBreakerOpen()) return false;
  if (!checkBudget()) return false;
  return true;
}
function getRedisStatus() {
  if (!redis) return "disabled";
  if (isBreakerOpen()) return "breaker-open";
  if (!checkBudget()) return "budget-exceeded";
  return "connected";
}
function ns(key) {
  return key.startsWith(PREFIX) ? key : `${PREFIX}${key}`;
}
function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function get(key) {
  if (!canUseRedis()) return null;
  const k = ns(key);
  try {
    const p = redis.get(k);
    let val = await withTimeout(p, TIMEOUT_MS);
    incBudget();
    recordSuccess();
    if (val == null) return null;
    // Upstash returns already parsed if stored as JSON, else string
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  } catch (e) {
    recordFailure(e);
    return null;
  }
}

async function set(key, value, ttlSeconds) {
  if (!ttlSeconds) throw new Error("set requires TTL");
  if (!canUseRedis()) return false;
  const k = ns(key);
  try {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    const p = redis.set(k, payload, { ex: ttlSeconds });
    await withTimeout(p, TIMEOUT_MS);
    incBudget();
    recordSuccess();
    return true;
  } catch (e) {
    recordFailure(e);
    return false;
  }
}

async function del(key) {
  if (!canUseRedis()) return false;
  const k = ns(key);
  try {
    const p = redis.del(k);
    await withTimeout(p, TIMEOUT_MS);
    incBudget();
    recordSuccess();
    return true;
  } catch (e) {
    recordFailure(e);
    return false;
  }
}

async function incr(key) {
  if (!canUseRedis()) return null;
  const k = ns(key);
  try {
    const p = redis.incr(k);
    const val = await withTimeout(p, TIMEOUT_MS);
    incBudget();
    recordSuccess();
    return val;
  } catch (e) {
    recordFailure(e);
    return null;
  }
}

async function wrap(key, ttlSeconds, fn) {
  const hit = await get(key);
  if (hit !== null) return hit;
  const fresh = await fn();
  // don't cache null/undefined falsy? but allow empty array?
  if (fresh !== undefined) {
    await set(key, fresh, ttlSeconds);
  }
  return fresh;
}

function invalidateUser(userId) {
  if (!userId) return;
  memDel(`auth:user:${userId}`);
}

module.exports = {
  get,
  set,
  del,
  incr,
  wrap,
  memGet,
  memSet,
  memDel,
  memWrap,
  invalidateUser,
  getRedisStatus,
  canUseRedis,
  // for health/tests
  _memStore: memStore,
  _getDailyCount: () => dailyCount,
  _getBreakerOpenUntil: () => breakerOpenUntil,
};
