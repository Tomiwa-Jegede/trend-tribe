// src/utils/referral.js — referral helpers (generation, normalization, credit/reversal)
const crypto = require("crypto");
const prisma = require("../db");
const config = require("../config/env");

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RESERVED = new Set(["ADMIN", "API", "WWW", "TREND", "TRIBE", "TEST", "NULL", "ROOT", "SUPPORT"]);

function randomCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

async function generateReferralCode(retries = 10) {
  for (let i = 0; i < retries; i++) {
    const code = randomCode(6);
    const exists = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  for (let i = 0; i < 5; i++) {
    const code = randomCode(8);
    const exists = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  return "R" + Date.now().toString(36).toUpperCase().slice(-5) + randomCode(2);
}

function normalizeReferralCode(raw) {
  if (!raw || typeof raw !== "string") return null;
  const n = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return n.length >= 4 ? n : null;
}

async function resolveReferralCode(raw) {
  const code = normalizeReferralCode(raw);
  if (!code) return null;
  return prisma.user.findUnique({ where: { referralCode: code }, select: { id: true, email: true, username: true, referralCode: true } });
}

async function setReferralCode(userId, raw) {
  const code = normalizeReferralCode(raw);
  if (!code || code.length < 4 || code.length > 12) {
    const err = new Error("Code must be 4-12 letters/numbers");
    err.status = 400;
    throw err;
  }
  if (RESERVED.has(code)) {
    const err = new Error("Reserved code");
    err.status = 400;
    throw err;
  }
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    const err = new Error("Code must be 4-12 letters/numbers");
    err.status = 400;
    throw err;
  }
  const taken = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  if (taken && taken.id !== userId) {
    const err = new Error("Code already taken");
    err.status = 409;
    throw err;
  }
  try {
    return await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
  } catch (e) {
    if (e.code === "P2002") {
      const err = new Error("Code already taken");
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

async function maybeCreditReferral({ referredId, transactionType, transactionId, amountKobo, tx }) {
  const db = tx || prisma;
  const existing = await db.referralCommission.findUnique({
    where: { transactionType_transactionId: { transactionType, transactionId: String(transactionId) } },
  });
  if (existing) return existing;
  const referral = await db.referral.findUnique({ where: { referredId } });
  if (!referral) return null;
  if (referral.status === "EXPIRED" || referral.commissionEndAt < new Date()) {
    if (referral.status !== "EXPIRED") {
      await db.referral.update({ where: { id: referral.id }, data: { status: "EXPIRED" } }).catch(() => {});
    }
    return null;
  }
  const rate = config.referral.rate;
  const commissionAmount = Math.floor(amountKobo * rate);
  if (commissionAmount <= 0) return null;
  try {
    const commission = await db.referralCommission.create({
      data: {
        referralId: referral.id,
        referrerId: referral.referrerId,
        referredId,
        transactionType,
        transactionId: String(transactionId),
        amountKobo,
        rate,
        commissionAmount,
        status: "CREDITED",
      },
    });
    await db.user.update({ where: { id: referral.referrerId }, data: { gigBalance: { increment: commissionAmount } } });
    await db.gigWalletTransaction.create({
      data: {
        userId: referral.referrerId,
        type: "REFERRAL_CREDIT",
        direction: "CREDIT",
        amount: commissionAmount,
        fee: 0,
        total: commissionAmount,
        meta: { referralId: referral.id, referralCommissionId: commission.id, transactionType, transactionId: String(transactionId), rate, amountKobo, commissionAmount },
      },
    });
    setImmediate(() => {
      prisma.notification.create({ data: { userId: referral.referrerId, type: "REFERRAL_CREDIT", listingId: null } }).catch(() => {});
      try {
        const { sendPushToUser } = require("./push");
        sendPushToUser(prisma, referral.referrerId, {
          title: `Referral — ₦${(commissionAmount / 100).toLocaleString()} credited`,
          body: `Someone you referred made a transaction — ₦${(commissionAmount / 100).toLocaleString()} added to your TrendTribe Wallet`,
          url: "/referrals",
          tag: `referral-credit-${commission.id}`,
        }).catch(() => {});
      } catch {}
      try {
        const { emitNotification } = require("../realtime");
        emitNotification(referral.referrerId, { type: "REFERRAL_CREDIT" });
      } catch {}
    });
    return commission;
  } catch (e) {
    if (e.code === "P2002") {
      return db.referralCommission.findUnique({ where: { transactionType_transactionId: { transactionType, transactionId: String(transactionId) } } });
    }
    throw e;
  }
}

async function maybeReverseReferral({ transactionType, transactionId, tx }) {
  const db = tx || prisma;
  const commission = await db.referralCommission.findUnique({ where: { transactionType_transactionId: { transactionType, transactionId: String(transactionId) } } });
  if (!commission || commission.status !== "CREDITED") return null;
  const amount = commission.commissionAmount;
  const updated = await db.referralCommission.updateMany({ where: { id: commission.id, status: "CREDITED" }, data: { status: "REVERSED", reversedAt: new Date() } });
  if (updated.count === 0) return null;
  const referrer = await db.user.findUnique({ where: { id: commission.referrerId }, select: { gigBalance: true } });
  const current = referrer?.gigBalance || 0;
  const debit = Math.min(amount, current);
  const debt = amount - debit;
  if (debit > 0) await db.user.update({ where: { id: commission.referrerId }, data: { gigBalance: { decrement: debit } } });
  await db.gigWalletTransaction.create({
    data: {
      userId: commission.referrerId,
      type: "REFERRAL_REVERSAL",
      direction: "DEBIT",
      amount,
      fee: 0,
      total: amount,
      meta: { referralId: commission.referralId, referralCommissionId: commission.id, transactionType, transactionId: String(transactionId), reversedAmount: amount, debited: debit, debtKobo: debt, clamped: debt > 0 },
    },
  });
  if (debt > 0) console.warn(`[REFERRAL REVERSAL DEBT] commission ${commission.id} debt ${debt} kobo for user ${commission.referrerId}`);
  setImmediate(() => {
    prisma.notification.create({ data: { userId: commission.referrerId, type: "REFERRAL_REVERSED", listingId: null } }).catch(() => {});
  });
  return updated;
}

module.exports = { generateReferralCode, normalizeReferralCode, resolveReferralCode, setReferralCode, maybeCreditReferral, maybeReverseReferral };
