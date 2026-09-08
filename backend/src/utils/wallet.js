// src/utils/wallet.js — Centralized gig wallet credit/debit notifications + ledger
const prisma = require("../db");

const formatNaira = (kobo) => `₦${(kobo / 100).toLocaleString()}`;

/**
 * Record a gig wallet movement, create Notification + Message + Push + ledger.
 * @param {Object} opts
 * @param {number} opts.userId
 * @param {string} opts.direction - CREDIT | DEBIT
 * @param {number} opts.amount - kobo principal
 * @param {number} [opts.fee=0] - kobo fee
 * @param {string} opts.type - e.g. GIG_CREATE, GIG_PAYOUT, TOPUP, WITHDRAW, TRANSFER_SENT etc
 * @param {string} opts.title - push title
 * @param {string} opts.body - push/message body
 * @param {Object} [opts.meta] - extra meta stored in ledger
 * @param {string} [opts.reference] - optional reference, else auto cuid
 */
async function recordWalletMovement({ userId, direction, amount, fee = 0, type, title, body, meta = {} }) {
  const total = direction === "DEBIT" ? amount + fee : amount;
  const notifType = direction === "CREDIT" ? "GIG_WALLET_CREDIT" : "GIG_WALLET_DEBIT";
  // Store specific type in meta for history filtering, but notification type is generic credit/debit for bell routing.
  // Also keep specific type as notification type for richer history if needed — we create both? We'll use specific type as notification type
  // and generic handling in NotificationBell will catch both GIG_WALLET_* and specific *CREDIT/*DEBIT patterns.
  const specificType = direction === "CREDIT" ? `${type}_CREDIT` : `${type}_DEBIT`;
  try {
    // ledger — best effort, don't fail main flow if this fails (e.g. duplicate ref)
    try {
      await prisma.gigWalletTransaction.create({
        data: {
          userId,
          type,
          direction,
          amount,
          fee,
          total,
          meta: { ...meta, specificType, title, body },
        },
      });
    } catch (e) {
      console.warn("[WALLET LEDGER FAIL]", e.message);
    }
    // notification + inbox + push + realtime — best effort
    try {
      await prisma.notification.create({ data: { userId, type: specificType, listingId: null } });
    } catch (e) { console.warn("[WALLET NOTIF FAIL]", e.message); }
    try {
      const subject = direction === "CREDIT" ? `Credit: ${title}` : `Debit: ${title}`;
      await prisma.message.create({ data: { senderId: userId, recipientId: userId, subject, body } });
    } catch (e) { console.warn("[WALLET MSG FAIL]", e.message); }
    try {
      const { sendPushToUser } = require("./push");
      const { emitNotification } = require("../realtime");
      const pushTitle = direction === "CREDIT" ? `Gig Wallet — Credit: ${formatNaira(amount)}` : `Gig Wallet — Debit: ${formatNaira(total)}`;
      sendPushToUser(prisma, userId, { title: pushTitle, body: body.slice(0, 120), url: "/gigs/wallet", tag: `gig-wallet-${Date.now()}-${userId}` }).catch(() => {});
      try { emitNotification(userId, { type: specificType }); } catch {}
      // also emit generic for bell count
      try { emitNotification(userId, { type: notifType }); } catch {}
    } catch {}
  } catch (err) {
    console.error("[RECORD WALLET MOVEMENT ERROR]", err.message);
  }
}

module.exports = { recordWalletMovement, formatNaira };
