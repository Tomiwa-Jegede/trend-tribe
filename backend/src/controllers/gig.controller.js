// src/controllers/gig.controller.js — Gigs escrow (Naira, 80/20, 5% cancel, 72h auto-release)
const prisma = require("../db");
const bcrypt = require("bcryptjs");

const fee = (amount) => Math.floor(amount * 0.2);
const payout = (amount) => amount - fee(amount);

// POST /api/gigs — create gig, escrow full amount from poster's gigBalance
const createGig = async (req, res) => {
  try {
    const { description, whatsapp, amount, timerHours } = req.body;
    if (!description?.trim() || description.trim().length < 10) return res.status(400).json({ error: "Description must be at least 10 chars" });
    if (!whatsapp?.trim() || !/^(\+234|0)[789][01]\d{8}$/.test(whatsapp.trim())) return res.status(400).json({ error: "Valid Nigerian WhatsApp required (080...)" });
    const amt = parseInt(amount, 10);
    if (!amt || amt < 100) return res.status(400).json({ error: "Amount must be at least ₦100 (10000 kobo)" });
    const amountKobo = amt * 100;
    const hours = parseInt(timerHours, 10) || 24;
    if (hours < 1 || hours > 168) return res.status(400).json({ error: "Timer must be 1-168 hours" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigBalance: true } });
    if (!user || user.gigBalance < amountKobo) return res.status(402).json({ error: `Need ₦${(amountKobo/100).toLocaleString()} in Gig wallet. You have ₦${((user?.gigBalance||0)/100).toLocaleString()}.`, needsGigBalance: true, gigBalance: user?.gigBalance || 0, required: amountKobo });

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const gig = await prisma.$transaction(async (tx) => {
      const ok = await tx.user.updateMany({ where: { id: req.user.id, gigBalance: { gte: amountKobo } }, data: { gigBalance: { decrement: amountKobo } } });
      if (ok.count === 0) throw new Error("BALANCE_RACE");
      return tx.gig.create({ data: { description: description.trim(), whatsapp: whatsapp.trim(), amount: amountKobo, escrowAmount: amountKobo, timerHours: hours, status: "OPEN", posterId: req.user.id, expiresAt } });
    });
    // realtime badge + push to all users when gig goes live
    try {
      const { emitGig } = require("../realtime");
      if (emitGig) emitGig("created", gig);
      // push notification to all subscribed users
      const { sendPushToUser } = require("../utils/push");
      const subs = await prisma.pushSubscription.findMany({ select: { userId: true } });
      const userIds = [...new Set(subs.map(s=>s.userId).filter(Boolean))];
      for (const uid of userIds) {
        if (uid === req.user.id) continue;
        sendPushToUser(prisma, uid, {
          title: "Trend Tribe — New gig posted",
          body: `${gig.description.slice(0,60)} · ₦${(gig.amount/100).toLocaleString()}`,
          url: "/gigs?view=feed",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `gig-${gig.id}`,
        }).catch(()=>{});
      }
      // also emit via generic push trigger if available
      try { const { trigger } = require("../utils/push"); trigger("gig", "gig:created", { id: gig.id }); } catch {}
    } catch {}
    return res.status(201).json({ gig });
  } catch (err) {
    if (err.message === "BALANCE_RACE") return res.status(402).json({ error: "Balance changed, try again" });
    console.error("[CREATE GIG ERROR]", err);
    return res.status(500).json({ error: "Could not create gig" });
  }
};

// GET /api/gigs — public feed, only OPEN and not expired
const listGigs = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;
    const where = { status: "OPEN", expiresAt: { gt: new Date() } };
    const [gigs, totalCount] = await Promise.all([
      prisma.gig.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limitNum, include: { poster: { select: { id: true, username: true, fullName: true } } } }),
      prisma.gig.count({ where }),
    ]);
    return res.json({ gigs, pagination: { totalCount, totalPages: Math.ceil(totalCount / limitNum), currentPage: pageNum, limit: limitNum } });
  } catch (err) {
    console.error("[LIST GIGS ERROR]", err);
    return res.status(500).json({ error: "Could not load gigs" });
  }
};

// GET /api/gigs/mine — my posted and claimed
const myGigs = async (req, res) => {
  try {
    const posted = await prisma.gig.findMany({ where: { posterId: req.user.id }, orderBy: { createdAt: "desc" } });
    const claimed = await prisma.gig.findMany({ where: { claimerId: req.user.id }, orderBy: { claimedAt: "desc" } });
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigBalance: true } });
    return res.json({ posted, claimed, gigBalance: user?.gigBalance || 0 });
  } catch (err) {
    console.error("[MY GIGS ERROR]", err);
    return res.status(500).json({ error: "Could not load" });
  }
};

// POST /api/gigs/:id/claim — free, no fee on claim (atomic)
const claimGig = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid gig id" });
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId === req.user.id) return res.status(400).json({ error: "You cannot claim your own gig" });
    const { count } = await prisma.gig.updateMany({ where: { id, status: "OPEN", expiresAt: { gt: new Date() } }, data: { status: "CLAIMED", claimerId: req.user.id, claimedAt: new Date() } });
    if (count === 0) return res.status(409).json({ error: "Gig is no longer open or already claimed" });
    const updated = await prisma.gig.findUnique({ where: { id } });
    return res.json({ gig: updated, whatsapp: gig.whatsapp, message: "Claimed — you got the poster's WhatsApp, coordinate off-platform. Poster must Confirm within 72h." });
  } catch (err) {
    console.error("[CLAIM GIG ERROR]", err);
    return res.status(500).json({ error: "Could not claim" });
  }
};

// POST /api/gigs/:id/confirm — poster confirms, 80% to claimer, 20% fee retained (atomic)
const confirmGig = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId !== req.user.id) return res.status(403).json({ error: "Only poster can confirm" });
    if (!gig.claimerId) return res.status(400).json({ error: "No claimer" });
    const pay = payout(gig.escrowAmount);
    const { count } = await prisma.gig.updateMany({ where: { id, status: "CLAIMED", posterId: req.user.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    if (count === 0) return res.status(409).json({ error: `Gig is no longer claimable (already ${gig.status})` });
    await prisma.user.update({ where: { id: gig.claimerId }, data: { gigBalance: { increment: pay } } });
    return res.json({ message: `Confirmed — ₦${(pay/100).toLocaleString()} sent to claimer, ₦${(fee(gig.escrowAmount)/100).toLocaleString()} fee retained.`, payout: pay, fee: fee(gig.escrowAmount) });
  } catch (err) {
    console.error("[CONFIRM GIG ERROR]", err);
    return res.status(500).json({ error: "Could not confirm" });
  }
};

// POST /api/gigs/:id/cancel — poster cancels before claimed: 5% fee, 95% refund (atomic)
const cancelGig = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId !== req.user.id) return res.status(403).json({ error: "Only poster can cancel" });
    const cancelFee = Math.floor(gig.escrowAmount * 0.05);
    const refund = gig.escrowAmount - cancelFee;
    const { count } = await prisma.gig.updateMany({ where: { id, status: "OPEN", posterId: req.user.id }, data: { status: "CANCELLED" } });
    if (count === 0) return res.status(409).json({ error: `Cannot cancel ${gig.status} gig` });
    await prisma.user.update({ where: { id: gig.posterId }, data: { gigBalance: { increment: refund } } });
    return res.json({ message: `Cancelled — 5% fee ₦${(cancelFee/100).toLocaleString()}, refund ₦${(refund/100).toLocaleString()} to Gig wallet.`, refund, fee: cancelFee });
  } catch (err) {
    console.error("[CANCEL GIG ERROR]", err);
    return res.status(500).json({ error: "Could not cancel" });
  }
};

// POST /api/gigs/:id/renew — poster renews expired gig (reset timer)
const renewGig = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId !== req.user.id) return res.status(403).json({ error: "Only poster" });
    if (gig.status !== "EXPIRED") return res.status(400).json({ error: "Only expired gigs can be renewed" });
    const hours = parseInt(req.body.timerHours, 10) || gig.timerHours;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const updated = await prisma.gig.update({ where: { id }, data: { status: "OPEN", expiresAt, timerHours: hours } });
    return res.json({ gig: updated });
  } catch (err) {
    console.error("[RENEW GIG ERROR]", err);
    return res.status(500).json({ error: "Could not renew" });
  }
};

// POST /api/gigs/:id/refund-expired — poster claims full refund on expired unclaimed
const refundExpired = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId !== req.user.id) return res.status(403).json({ error: "Only poster" });
    if (gig.status !== "EXPIRED") return res.status(400).json({ error: "Only expired" });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: gig.posterId }, data: { gigBalance: { increment: gig.escrowAmount } } });
      await tx.gig.update({ where: { id }, data: { status: "CANCELLED" } });
    });
    return res.json({ message: `Refunded ₦${(gig.escrowAmount/100).toLocaleString()} to Gig wallet.` });
  } catch (err) {
    console.error("[REFUND EXPIRED ERROR]", err);
    return res.status(500).json({ error: "Could not refund" });
  }
};

// POST /api/gigs/:id/dispute — poster disputes before 72h auto-release
const disputeGig = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId !== req.user.id) return res.status(403).json({ error: "Only poster can dispute" });
    if (gig.status !== "CLAIMED") return res.status(400).json({ error: "Only claimed can be disputed" });
    const updated = await prisma.gig.update({ where: { id }, data: { status: "DISPUTED" } });
    return res.json({ gig: updated, message: "Disputed — admin will review, auto-release paused." });
  } catch (err) {
    console.error("[DISPUTE GIG ERROR]", err);
    return res.status(500).json({ error: "Could not dispute" });
  }
};

// POST /api/gigs/withdraw — withdraw Gig Naira to bank (requires PIN, 1% fee, admin approve → Flutterwave transfer)
// Deduct immediately on request, then admin approves → Flutterwave transfer. Status shows "In review" (stored as PENDING).
const withdrawGig = async (req, res) => {
  try {
    const { amount, bankCode, accountNumber, pin } = req.body;
    const amt = parseInt(amount, 10);
    if (!amt || amt < 1000) return res.status(400).json({ error: "Minimum withdraw ₦1000" });
    const cleanAcc = String(accountNumber || "").replace(/\D/g,"").slice(0,10);
    const cleanBank = String(bankCode || "").trim();
    if (!cleanBank || !/^\d{10}$/.test(cleanAcc)) return res.status(400).json({ error: "Valid bank code and 10-digit account number required" });
    if (!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: "4-digit PIN required" });
    const kobo = amt * 100;
    let feeKobo = Math.round(kobo * 0.01); // 1%
    if (feeKobo === 0 && kobo > 0) feeKobo = 1;
    const totalKobo = kobo + feeKobo;

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigBalance: true, gigTransferPin: true } });
    if (!user.gigTransferPin) return res.status(400).json({ error: "Set your 4-digit transfer PIN first" });
    const cleanPinW = String(pin || "").trim();
    if (!/^\d{4}$/.test(cleanPinW)) return res.status(400).json({ error: "4-digit PIN required" });
    const pinOk = await bcrypt.compare(cleanPinW, user.gigTransferPin);
    if (!pinOk) {
      console.warn(`[WITHDRAW PIN FAIL] user ${req.user.id}`);
      return res.status(403).json({ error: "Incorrect PIN — if you forgot it, use Change PIN with OTP to reset" });
    }
    if ((user.gigBalance || 0) < totalKobo) return res.status(402).json({ error: `Insufficient Gig balance. Need ₦${(totalKobo/100).toLocaleString()} (₦${amt.toLocaleString()} + ₦${(feeKobo/100).toFixed(2)} fee). You have ₦${((user.gigBalance||0)/100).toLocaleString()}.` });

    // Optional: resolve bank account name via Flutterwave for snapshot
    let accountName = null, bankName = null;
    try {
      const flwRes = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
        method: "POST",
        headers: { Authorization: `Bearer ${require("../config/env").flutterwave.secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: cleanAcc, account_bank: cleanBank }),
      });
      const data = await flwRes.json();
      if (data.status === "success" && data.data?.account_name) { accountName = data.data.account_name; bankName = data.data.account_bank || cleanBank; }
    } catch {}

    const reference = `gigw_${req.user.id}_${Date.now()}`;
    // Deduct immediately from gig balance + save withdrawal as In review (PENDING)
    const w = await prisma.$transaction(async (tx) => {
      const ok = await tx.user.updateMany({ where: { id: req.user.id, gigBalance: { gte: totalKobo } }, data: { gigBalance: { decrement: totalKobo } } });
      if (ok.count === 0) throw new Error("BALANCE_RACE");
      await tx.user.update({ where: { id: req.user.id }, data: { bankAccountNumber: cleanAcc, bankCode: cleanBank, bankName: bankName || cleanBank } });
      return tx.gigWithdrawal.create({ data: { userId: req.user.id, amount: kobo, fee: feeKobo, bankCode: cleanBank, bankAccountNumber: cleanAcc, bankName: bankName || cleanBank, accountName, reference, status: "PENDING" } });
    });
    // inbox + push + notification for debit (red) — request received
    try {
      await prisma.notification.create({ data: { userId: req.user.id, type: "GIG_WITHDRAW_PENDING", listingId: null } });
      await prisma.message.create({ data: { senderId: req.user.id, recipientId: req.user.id, subject: "Gig Withdrawal Requested — In review", body: `Withdrawal ₦${amt.toLocaleString()} (fee ₦${(feeKobo/100).toFixed(2)}) to ${bankName || cleanBank} • ${cleanAcc} — ref ${reference} — In review, awaiting admin approval. ₦${(totalKobo/100).toLocaleString()} debited from Gig wallet.` } });
      const { sendPushToUser } = require("../utils/push");
      const { emitNotification } = require("../realtime");
      sendPushToUser(prisma, req.user.id, { title: "Gig Wallet — Withdrawal in review", body: `₦${amt.toLocaleString()} to ${bankName || cleanBank} — in review, ₦${(totalKobo/100).toLocaleString()} debited`, url: "/gigs/wallet", tag: `gig-wd-${reference}` }).catch(()=>{});
      try { emitNotification(req.user.id, { type: "GIG_WITHDRAW_PENDING" }); } catch {}
    } catch {}
    return res.status(201).json({ withdrawal: w, message: `Withdraw request ₦${amt.toLocaleString()} received — ₦${(totalKobo/100).toLocaleString()} debited, now in review.` });
  } catch (err) {
    if (err.message === "BALANCE_RACE") return res.status(402).json({ error: "Balance changed, try again" });
    console.error("[WITHDRAW GIG ERROR]", err);
    return res.status(500).json({ error: "Could not withdraw" });
  }
};

const setBank = async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || !/^\d{10}$/.test(accountNumber.trim())) return res.status(400).json({ error: "10-digit account number required" });
    if (!bankCode?.trim()) return res.status(400).json({ error: "Bank code required" });
    let accountName = null, bankName = bankCode;
    try {
      const flwRes = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
        method: "POST",
        headers: { Authorization: `Bearer ${require("../config/env").flutterwave.secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber.trim(), account_bank: bankCode.trim() }),
      });
      const data = await flwRes.json();
      if (data.status === "success" && data.data?.account_name) { accountName = data.data.account_name; bankName = data.data.account_bank || bankCode; }
    } catch {}
    await prisma.user.update({ where: { id: req.user.id }, data: { bankAccountNumber: accountNumber.trim(), bankCode: bankCode.trim(), bankName } });
    return res.json({ bankAccountNumber: accountNumber.trim(), bankCode: bankCode.trim(), bankName, accountName, message: accountName ? `Verified — ${accountName}` : "Bank saved" });
  } catch (err) {
    console.error("[SET BANK ERROR]", err);
    return res.status(500).json({ error: "Could not save bank" });
  }
};

const resolveBank = async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || !bankCode) return res.status(400).json({ error: "Account number and bank code required" });
    const flwRes = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
      method: "POST",
      headers: { Authorization: `Bearer ${require("../config/env").flutterwave.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ account_number: accountNumber.trim(), account_bank: bankCode.trim() }),
    });
    const data = await flwRes.json();
    if (data.status === "success" && data.data?.account_name) return res.json({ accountName: data.data.account_name, bankName: data.data.account_bank });
    return res.status(404).json({ error: data.message || "Could not resolve account" });
  } catch (err) {
    console.error("[RESOLVE BANK ERROR]", err);
    return res.status(500).json({ error: "Could not resolve" });
  }
};

// ─── Admin: list/approve/reject withdrawals ─────────
const listGigWithdrawals = async (req, res) => {
  try {
    const { status = "PENDING" } = req.query;
    const where = status === "ALL" ? {} : { status: status.toUpperCase() };
    const withdrawals = await prisma.gigWithdrawal.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { id: true, username: true, fullName: true, gigAccountNumber: true } } } });
    return res.json({ withdrawals });
  } catch (err) {
    console.error("[LIST GIG WITHDRAWALS ERROR]", err);
    return res.status(500).json({ error: "Could not load" });
  }
};

const approveGigWithdrawal = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const w = await prisma.gigWithdrawal.findUnique({ where: { id } });
    if (!w) return res.status(404).json({ error: "Withdrawal not found" });
    if (w.status !== "PENDING") return res.status(400).json({ error: `Already ${w.status}` });

    const totalKobo = w.amount + (w.fee || 0);
    // Already deducted on request — no need to check user balance again, just check Flutterwave cash
    // Check Flutterwave main account balance (T+1) before transfer
    const config = require("../config/env");
    try {
      const balRes = await fetch("https://api.flutterwave.com/v3/balances", { headers: { Authorization: `Bearer ${config.flutterwave.secretKey}` } });
      const balData = await balRes.json();
      const ngnBal = balData.data?.find?.(b=>b.currency==="NGN") || balData.data?.[0];
      const availableKobo = ngnBal ? Math.round(parseFloat(ngnBal.available_balance || 0) * 100) : null;
      if (availableKobo !== null && availableKobo < w.amount) {
        return res.status(402).json({ error: `Flutterwave main account has insufficient cash (T+1). Available ₦${(availableKobo/100).toLocaleString()}, need ₦${(w.amount/100).toLocaleString()}. Keeps In review — will auto-retry after settlement.`, flutterwaveBalance: availableKobo });
      }
    } catch {}

    // Call Flutterwave transfer
    const flwRes = await fetch("https://api.flutterwave.com/v3/transfers", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.flutterwave.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        account_bank: w.bankCode,
        account_number: w.bankAccountNumber,
        amount: w.amount / 100,
        currency: "NGN",
        reference: w.reference || `gigw_${w.id}_${Date.now()}`,
        narration: `Trend Tribe Gig payout ${w.reference}`,
      }),
    });
    const data = await flwRes.json();
    if (data.status === "success") {
      // Already debited on request — just mark completed
      await prisma.gigWithdrawal.update({ where: { id }, data: { status: "COMPLETED" } });
      try {
        await prisma.notification.create({ data: { userId: w.userId, type: "GIG_WITHDRAW_COMPLETED", listingId: null } });
        await prisma.message.create({ data: { senderId: w.userId, recipientId: w.userId, subject: "Gig Withdrawal Completed", body: `Withdrawal ₦${(w.amount/100).toLocaleString()} (fee ₦${(w.fee/100).toFixed(2)}) to ${w.bankName} • ${w.bankAccountNumber} — COMPLETED. ₦${(totalKobo/100).toLocaleString()} already debited on request — ref ${w.reference}.` } });
        const { sendPushToUser } = require("../utils/push");
        const { emitNotification } = require("../realtime");
        sendPushToUser(prisma, w.userId, { title: "Gig Wallet — Withdrawal completed", body: `₦${(w.amount/100).toLocaleString()} sent to your bank`, url: "/gigs/wallet", tag: `gig-wd-c-${w.reference}` }).catch(()=>{});
        try { emitNotification(w.userId, { type: "GIG_WITHDRAW_COMPLETED" }); } catch {}
      } catch {}
      return res.json({ message: "Approved — Flutterwave transfer initiated", flutterwave: data.data });
    }
    // Insufficient funds on Flutterwave side — keep In review for retry, already debited (refund only on reject)
    if (data.message?.toLowerCase().includes("insufficient") || data.message?.toLowerCase().includes("balance")) {
      return res.status(402).json({ error: `Flutterwave has no cash to pay now (T+1). Kept In review — retry after next settlement.`, details: data });
    }
    return res.status(502).json({ error: data.message || "Transfer failed", details: data });
  } catch (err) {
    console.error("[APPROVE GIG WITHDRAWAL ERROR]", err);
    return res.status(500).json({ error: "Could not approve" });
  }
};

const rejectGigWithdrawal = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const w = await prisma.gigWithdrawal.findUnique({ where: { id } });
    if (!w) return res.status(404).json({ error: "Withdrawal not found" });
    if (w.status !== "PENDING") return res.status(400).json({ error: `Already ${w.status}` });
    // Already debited on request (amount + fee) — reject refunds exact amount back (principal), fee retained as charge
    const totalKobo = w.amount + (w.fee || 0);
    const feeKobo = w.fee || 0;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: w.userId }, data: { gigBalance: { increment: w.amount } } });
      await tx.gigWithdrawal.update({ where: { id }, data: { status: "REJECTED" } });
    });
    try {
      await prisma.notification.create({ data: { userId: w.userId, type: "GIG_WITHDRAW_REJECTED", listingId: null } });
      await prisma.message.create({ data: { senderId: w.userId, recipientId: w.userId, subject: "Gig Withdrawal Rejected — Refunded", body: `Withdrawal ₦${(w.amount/100).toLocaleString()} — REJECTED — ₦${(w.amount/100).toLocaleString()} refunded to Gig wallet (charges: principal ₦${(w.amount/100).toLocaleString()} + fee ₦${(feeKobo/100).toFixed(2)} = ₦${(totalKobo/100).toLocaleString()} debited, fee retained) — ref ${w.reference}.` } });
      const { sendPushToUser } = require("../utils/push");
      const { emitNotification } = require("../realtime");
      sendPushToUser(prisma, w.userId, { title: "Gig Wallet — Withdrawal rejected", body: `₦${(w.amount/100).toLocaleString()} rejected — ₦${(w.amount/100).toLocaleString()} refunded (fee ₦${(feeKobo/100).toFixed(2)} not refunded)`, url: "/gigs/wallet", tag: `gig-wd-r-${w.reference}` }).catch(()=>{});
      try { emitNotification(w.userId, { type: "GIG_WITHDRAW_REJECTED" }); } catch {}
    } catch {}
    return res.json({ message: `Rejected — ₦${(w.amount/100).toLocaleString()} refunded (fee ₦${(feeKobo/100).toFixed(2)} retained).` });
  } catch (err) {
    console.error("[REJECT GIG WITHDRAWAL ERROR]", err);
    return res.status(500).json({ error: "Could not reject" });
  }
};

// User cancels own pending withdrawal — refunds principal, fee retained
const cancelGigWithdrawal = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const w = await prisma.gigWithdrawal.findUnique({ where: { id } });
    if (!w) return res.status(404).json({ error: "Withdrawal not found" });
    if (w.userId !== req.user.id) return res.status(403).json({ error: "Not your withdrawal" });
    if (w.status !== "PENDING") return res.status(400).json({ error: `Already ${w.status === "PENDING" ? "In review" : w.status}` });
    const feeKobo = w.fee || 0;
    const totalKobo = w.amount + feeKobo;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: w.userId }, data: { gigBalance: { increment: w.amount } } });
      await tx.gigWithdrawal.update({ where: { id }, data: { status: "CANCELLED" } });
    });
    try {
      await prisma.notification.create({ data: { userId: w.userId, type: "GIG_WITHDRAW_CANCELLED", listingId: null } });
      await prisma.message.create({ data: { senderId: w.userId, recipientId: w.userId, subject: "Gig Withdrawal Cancelled — Refunded", body: `Withdrawal ₦${(w.amount/100).toLocaleString()} — CANCELLED — ₦${(w.amount/100).toLocaleString()} refunded to Gig wallet (charges: principal ₦${(w.amount/100).toLocaleString()} + fee ₦${(feeKobo/100).toFixed(2)} = ₦${(totalKobo/100).toLocaleString()} debited, fee retained) — ref ${w.reference}.` } });
      const { sendPushToUser } = require("../utils/push");
      const { emitNotification } = require("../realtime");
      sendPushToUser(prisma, w.userId, { title: "Gig Wallet — Withdrawal cancelled", body: `₦${(w.amount/100).toLocaleString()} cancelled — ₦${(w.amount/100).toLocaleString()} refunded`, url: "/gigs/wallet", tag: `gig-wd-cnl-${w.reference}` }).catch(()=>{});
      try { emitNotification(w.userId, { type: "GIG_WITHDRAW_CANCELLED" }); } catch {}
    } catch {}
    return res.json({ message: `Cancelled — ₦${(w.amount/100).toLocaleString()} refunded (fee ₦${(feeKobo/100).toFixed(2)} retained).` });
  } catch (err) {
    console.error("[CANCEL GIG WITHDRAWAL ERROR]", err);
    return res.status(500).json({ error: "Could not cancel" });
  }
};

// ─── Gig wallet account number (10 digits) + transfer ─────────
const generateAccountNumber = async () => {
  for (let i = 0; i < 10; i++) {
    const num = "80" + Math.floor(10000000 + Math.random() * 90000000).toString() + Math.floor(10 + Math.random() * 90).toString(); // 10 digits starting 80
    const exists = await prisma.user.findUnique({ where: { gigAccountNumber: num } });
    if (!exists) return num.slice(0, 10);
  }
  return "80" + Date.now().toString().slice(-8);
};

const getGigAccount = async (req, res) => {
  try {
    let user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigAccountNumber: true, gigBalance: true } });
    if (!user.gigAccountNumber) {
      const acc = await generateAccountNumber();
      user = await prisma.user.update({ where: { id: req.user.id }, data: { gigAccountNumber: acc }, select: { gigAccountNumber: true, gigBalance: true } });
    }
    return res.json({ accountNumber: user.gigAccountNumber, gigBalance: user.gigBalance });
  } catch (err) {
    console.error("[GET GIG ACCOUNT ERROR]", err);
    return res.status(500).json({ error: "Could not load account" });
  }
};

const resolveGigAccount = async (req, res) => {
  try {
    const { accountNumber } = req.body;
    if (!accountNumber || !/^\d{10}$/.test(accountNumber.trim())) return res.status(400).json({ error: "Account number must be 10 digits" });
    const user = await prisma.user.findUnique({ where: { gigAccountNumber: accountNumber.trim() }, select: { id: true, fullName: true, username: true, gigAccountNumber: true } });
    if (!user) return res.status(404).json({ error: "Account not found" });
    if (user.id === req.user.id) return res.status(400).json({ error: "Cannot transfer to yourself" });
    return res.json({ user });
  } catch (err) {
    console.error("[RESOLVE GIG ACCOUNT ERROR]", err);
    return res.status(500).json({ error: "Could not resolve" });
  }
};

const transferGig = async (req, res) => {
  try {
    const { toAccountNumber, amount, pin } = req.body;
    if (!toAccountNumber || !/^\d{10}$/.test(toAccountNumber.trim())) return res.status(400).json({ error: "Recipient account must be 10 digits" });
    const amt = parseInt(amount, 10);
    if (!amt || amt < 1) return res.status(400).json({ error: "Amount must be at least ₦1" });
    if (!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: "4-digit transfer PIN required" });
    const amountKobo = amt * 100;
    let feeKobo = Math.round(amountKobo * 0.01); // 1%
    if (feeKobo === 0 && amountKobo > 0) feeKobo = 1; // min 1 kobo
    const totalKobo = amountKobo + feeKobo;

    const recipient = await prisma.user.findUnique({ where: { gigAccountNumber: toAccountNumber.trim() }, select: { id: true, fullName: true, username: true } });
    if (!recipient) return res.status(404).json({ error: "Recipient account not found" });
    if (recipient.id === req.user.id) return res.status(400).json({ error: "Cannot transfer to yourself" });

    const sender = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigBalance: true, gigAccountNumber: true, gigTransferPin: true } });
    if (!sender.gigTransferPin) return res.status(400).json({ error: "Set your 4-digit transfer PIN first" });
    const cleanPin = String(pin || "").trim();
    if (!/^\d{4}$/.test(cleanPin)) return res.status(400).json({ error: "4-digit PIN required" });
    const pinOk = await bcrypt.compare(cleanPin, sender.gigTransferPin);
    if (!pinOk) {
      console.warn(`[TRANSFER PIN FAIL] user ${req.user.id} pin len ${cleanPin.length}`);
      return res.status(403).json({ error: "Incorrect PIN — if you forgot it, use Change PIN with OTP to reset" });
    }
    // ensure sender has accountNumber
    let senderAcc = sender.gigAccountNumber;
    if (!senderAcc) {
      senderAcc = await generateAccountNumber();
      await prisma.user.update({ where: { id: req.user.id }, data: { gigAccountNumber: senderAcc } });
    }
    if ((sender.gigBalance || 0) < totalKobo) return res.status(402).json({ error: `Insufficient Gig balance. Need ₦${(totalKobo/100).toLocaleString()} (₦${amt.toLocaleString()} + ₦${feeKobo/100} fee). You have ₦${((sender.gigBalance||0)/100).toLocaleString()}.`, required: totalKobo, fee: feeKobo, gigBalance: sender.gigBalance });

    const transfer = await prisma.$transaction(async (tx) => {
      const ok = await tx.user.updateMany({ where: { id: req.user.id, gigBalance: { gte: totalKobo } }, data: { gigBalance: { decrement: totalKobo } } });
      if (ok.count === 0) throw new Error("BALANCE_RACE");
      await tx.user.update({ where: { id: recipient.id }, data: { gigBalance: { increment: amountKobo } } });
      // fee stays with platform (not credited to anyone) — could log as platform revenue
      return tx.gigTransfer.create({ data: { fromUserId: req.user.id, toUserId: recipient.id, amount: amountKobo, fee: feeKobo, status: "SUCCESS" } });
    });
    // notify both + push + inbox — debit red for sender, credit green for receiver
    try {
      const senderUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { username: true } });
      await prisma.notification.createMany({ data: [
        { userId: req.user.id, actorId: recipient.id, type: "GIG_TRANSFER_SENT", listingId: null },
        { userId: recipient.id, actorId: req.user.id, type: "GIG_TRANSFER_RECEIVED", listingId: null },
      ]});
      const { sendPushToUser } = require("../utils/push");
      const { emitNotification } = require("../realtime");
      sendPushToUser(prisma, req.user.id, { title: "Gig Wallet — Debit", body: `Sent ₦${amt.toLocaleString()} to @${recipient.username} — fee ₦${(feeKobo/100).toFixed(2)}`, url: "/gigs/wallet", tag: `gig-sent-${transfer.id}` }).catch(()=>{});
      sendPushToUser(prisma, recipient.id, { title: "Gig Wallet — Credit", body: `Received ₦${amt.toLocaleString()} from @${senderUser?.username}`, url: "/gigs/wallet", tag: `gig-recv-${transfer.id}` }).catch(()=>{});
      try { emitNotification(req.user.id, { type: "GIG_TRANSFER_SENT" }); emitNotification(recipient.id, { type: "GIG_TRANSFER_RECEIVED" }); } catch {}
      await prisma.message.createMany({ data: [
        { senderId: req.user.id, recipientId: req.user.id, body: `Debit: You sent ₦${amt.toLocaleString()} to @${recipient.username} (fee ₦${(feeKobo/100).toFixed(2)}) — ref ${transfer.reference}`, subject: "Gig Transfer Sent — Debit" },
        { senderId: req.user.id, recipientId: recipient.id, body: `Credit: You received ₦${amt.toLocaleString()} from @${senderUser?.username} — ref ${transfer.reference}`, subject: "Gig Transfer Received — Credit" },
      ]});
    } catch {}
    return res.json({ transfer, fee: feeKobo, amount: amountKobo, recipient, message: `Transferred ₦${amt.toLocaleString()} to ${recipient.fullName} @${recipient.username} — fee ₦${feeKobo/100}` });
  } catch (err) {
    if (err.message === "BALANCE_RACE") return res.status(402).json({ error: "Balance changed, try again" });
    console.error("[TRANSFER GIG ERROR]", err);
    return res.status(500).json({ error: "Could not transfer" });
  }
};

const listGigTransfers = async (req, res) => {
  try {
    const sent = await prisma.gigTransfer.findMany({ where: { fromUserId: req.user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { toUser: { select: { fullName: true, username: true, gigAccountNumber: true } } } });
    const received = await prisma.gigTransfer.findMany({ where: { toUserId: req.user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { fromUser: { select: { fullName: true, username: true, gigAccountNumber: true } } } });
    return res.json({ sent, received });
  } catch (err) {
    console.error("[LIST GIG TRANSFERS ERROR]", err);
    return res.status(500).json({ error: "Could not load" });
  }
};

const listMyGigWithdrawals = async (req, res) => {
  try {
    const withdrawals = await prisma.gigWithdrawal.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 20 });
    return res.json({ withdrawals });
  } catch (err) {
    console.error("[LIST MY GIG WITHDRAWALS ERROR]", err);
    return res.status(500).json({ error: "Could not load" });
  }
};

const listMyGigPurchases = async (req, res) => {
  try {
    const purchases = await prisma.gigTokenPurchase.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 20 });
    return res.json({ purchases });
  } catch (err) {
    console.error("[LIST MY GIG PURCHASES ERROR]", err);
    return res.status(500).json({ error: "Could not load" });
  }
};

const requestPinOtp = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true, fullName: true } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.user.update({ where: { id: req.user.id }, data: { gigPinOtpCode: otp, gigPinOtpExpiresAt: expiresAt } });
    console.log(`[PIN OTP] user ${req.user.id} ${user.email} -> ${otp}`);
    try {
      const { sendOTPEmail } = require("../utils/email");
      await sendOTPEmail(user.email, user.fullName, otp);
    } catch (emailErr) {
      console.error("[PIN OTP EMAIL FAILED]", emailErr.message);
      // don't fail the request — OTP is still stored, allow dev to use it
      const isDev = require("../config/env").isDev;
      return res.json({ message: `OTP generated${isDev ? ` — code ${otp} (email delivery failed, use this code)` : ` — email delivery failed, code logged. Contact support if not received.`}`, ...(isDev ? { devOtp: otp } : {}) });
    }
    return res.json({ message: `OTP sent to ${user.email} — valid for 10 minutes` });
  } catch (err) {
    console.error("[REQUEST PIN OTP ERROR]", err);
    return res.status(500).json({ error: "Could not generate OTP" });
  }
};

const setGigPin = async (req, res) => {
  try {
    const pin = String(req.body.pin || "").trim();
    const otp = String(req.body.otp || "").trim();
    if (!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: "PIN must be 4 digits" });
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigTransferPin: true, gigPinOtpCode: true, gigPinOtpExpiresAt: true } });
    // If updating existing PIN, require OTP
    if (user.gigTransferPin) {
      if (!otp || !/^\d{6}$/.test(otp)) return res.status(400).json({ error: "6-digit OTP required to update PIN — tap 'Change PIN' to get OTP first" });
      const codeOk = user.gigPinOtpCode && String(user.gigPinOtpCode).trim() === otp && user.gigPinOtpExpiresAt && new Date() <= new Date(user.gigPinOtpExpiresAt);
      if (!codeOk) {
        return res.status(400).json({ error: "Invalid or expired OTP — request a fresh code" });
      }
    }
    const hash = await bcrypt.hash(pin, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { gigTransferPin: hash, gigPinOtpCode: null, gigPinOtpExpiresAt: null } });
    console.log(`[SET PIN] user ${req.user.id} -> OK`);
    return res.json({ message: user.gigTransferPin ? "Transfer PIN updated." : "Transfer PIN set. You will need it to confirm transfers and withdrawals." });
  } catch (err) {
    console.error("[SET GIG PIN ERROR]", err);
    return res.status(500).json({ error: "Could not set PIN" });
  }
};

const hasGigPin = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigTransferPin: true, gigAccountNumber: true, gigBalance: true } });
    return res.json({ hasPin: !!user.gigTransferPin, accountNumber: user.gigAccountNumber, gigBalance: user.gigBalance });
  } catch (err) {
    return res.status(500).json({ error: "Could not check" });
  }
};

const getBanks = async (req, res) => {
  try {
    const config = require("../config/env");
    const flwRes = await fetch("https://api.flutterwave.com/v3/banks/NG", { headers: { Authorization: `Bearer ${config.flutterwave.secretKey}` } });
    const data = await flwRes.json();
    if (data.status === "success" && Array.isArray(data.data)) {
      // Ensure major fintechs are included (Opay, Kuda, Moniepoint, PalmPay) — Flutterwave list already has them but ensure
      return res.json({ banks: data.data });
    }
    // fallback major banks
    return res.json({ banks: [
      { code: "044", name: "Access Bank" },
      { code: "058", name: "GTBank" },
      { code: "011", name: "First Bank" },
      { code: "033", name: "UBA" },
      { code: "057", name: "Zenith Bank" },
      { code: "999992", name: "OPay" },
      { code: "50211", name: "Kuda Bank" },
      { code: "50515", name: "Moniepoint" },
      { code: "999991", name: "PalmPay" },
      { code: "035", name: "Wema Bank" },
    ]});
  } catch (err) {
    console.error("[GET BANKS ERROR]", err);
    return res.json({ banks: [
      { code: "044", name: "Access Bank" },
      { code: "058", name: "GTBank" },
      { code: "011", name: "First Bank" },
      { code: "033", name: "UBA" },
      { code: "057", name: "Zenith Bank" },
      { code: "999992", name: "OPay" },
      { code: "50211", name: "Kuda Bank" },
      { code: "50515", name: "Moniepoint" },
      { code: "999991", name: "PalmPay" },
    ]});
  }
};

// Cron helpers
const expireGigs = async () => {
  try {
    const now = new Date();
    const res = await prisma.gig.updateMany({ where: { status: "OPEN", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
    if (res.count) console.log(`[GIGS] Expired ${res.count} gigs`);
  } catch (e) { console.error("[GIGS EXPIRE ERROR]", e.message); }
};

const autoReleaseGigs = async () => {
  try {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const gigs = await prisma.gig.findMany({ where: { status: "CLAIMED", claimedAt: { lte: cutoff } } });
    for (const g of gigs) {
      const pay = payout(g.escrowAmount);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: g.claimerId }, data: { gigBalance: { increment: pay } } });
        await tx.gig.update({ where: { id: g.id }, data: { status: "COMPLETED", completedAt: new Date() } });
      });
      console.log(`[GIGS] Auto-released gig ${g.id} → ₦${pay/100} to ${g.claimerId}`);
    }
  } catch (e) { console.error("[GIGS AUTORELEASE ERROR]", e.message); }
};

module.exports = { createGig, listGigs, myGigs, claimGig, confirmGig, cancelGig, renewGig, refundExpired, disputeGig, withdrawGig, getGigAccount, resolveGigAccount, transferGig, listGigTransfers, listMyGigWithdrawals, listMyGigPurchases, setGigPin, requestPinOtp, hasGigPin, setBank, resolveBank, getBanks, listGigWithdrawals, approveGigWithdrawal, rejectGigWithdrawal, cancelGigWithdrawal, expireGigs, autoReleaseGigs };
