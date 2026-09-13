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
    // wallet: debit + history + credit notification
    try {
      const { recordWalletMovement } = require("../utils/wallet");
      await recordWalletMovement({ userId: req.user.id, direction: "DEBIT", amount: amountKobo, fee: 0, type: "GIG_CREATE", title: "Gig posted — escrow held", body: `Debit: ₦${(amountKobo/100).toLocaleString()} held for gig #${gig.id} "${gig.description.slice(0,40)}" — escrow from Gig wallet.`, meta: { gigId: gig.id } });
    } catch {}
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

// POST /api/gigs/:id/confirm — poster confirms, 80% to claimer, 20% fee retained (atomic) — ADMIN free (100% to claimer, no profit)
const confirmGig = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId !== req.user.id) return res.status(403).json({ error: "Only poster can confirm" });
    if (!gig.claimerId) return res.status(400).json({ error: "No claimer" });
    const isAdmin = req.user.role === "ADMIN";
    const gross = isAdmin ? 0 : fee(gig.escrowAmount);
    const pay = isAdmin ? gig.escrowAmount : payout(gig.escrowAmount);
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.gig.updateMany({ where: { id, status: "CLAIMED", posterId: req.user.id }, data: { status: "COMPLETED", completedAt: new Date() } });
      if (count === 0) throw new Error("ALREADY");
      await tx.user.update({ where: { id: gig.claimerId }, data: { gigBalance: { increment: pay } } });
      if (!isAdmin) await tx.platformProfit.create({ data: { source: "GIG_CONFIRM_20", grossFee: gross, netFee: gross, refId: String(id), meta: { gigId: id, posterId: gig.posterId, claimerId: gig.claimerId } } });
    });
    try {
      const { recordWalletMovement } = require("../utils/wallet");
      await recordWalletMovement({ userId: gig.claimerId, direction: "CREDIT", amount: pay, fee: 0, type: "GIG_PAYOUT", title: "Gig payout — credited", body: `Credit: ₦${(pay/100).toLocaleString()} from gig #${id}${isAdmin ? " (admin free — no fee)" : ` (fee ₦${(gross/100).toLocaleString()} retained)`} — credited to Gig wallet.`, meta: { gigId: id, fee: gross, adminFree: isAdmin } });
    } catch {}
    return res.json({ message: isAdmin ? `Confirmed (admin free) — ₦${(pay/100).toLocaleString()} sent to claimer.` : `Confirmed — ₦${(pay/100).toLocaleString()} sent to claimer, ₦${(gross/100).toLocaleString()} fee retained.`, payout: pay, fee: gross });
  } catch (err) {
    if (err.message === "ALREADY") return res.status(409).json({ error: `Gig is no longer claimable` });
    console.error("[CONFIRM GIG ERROR]", err);
    return res.status(500).json({ error: "Could not confirm" });
  }
};

// POST /api/gigs/:id/cancel — poster cancels before claimed: 5% fee, 95% refund (atomic) — ADMIN free (100% refund)
const cancelGig = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId !== req.user.id) return res.status(403).json({ error: "Only poster can cancel" });
    const isAdmin = req.user.role === "ADMIN";
    const cancelFee = isAdmin ? 0 : Math.floor(gig.escrowAmount * 0.05);
    const refund = gig.escrowAmount - cancelFee;
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.gig.updateMany({ where: { id, status: "OPEN", posterId: req.user.id }, data: { status: "CANCELLED" } });
      if (count === 0) throw new Error("ALREADY");
      await tx.user.update({ where: { id: gig.posterId }, data: { gigBalance: { increment: refund } } });
      if (!isAdmin) await tx.platformProfit.create({ data: { source: "GIG_CANCEL_5", grossFee: cancelFee, netFee: cancelFee, refId: String(id), meta: { gigId: id } } });
    });
    try {
      const { recordWalletMovement } = require("../utils/wallet");
      await recordWalletMovement({ userId: gig.posterId, direction: "CREDIT", amount: refund, fee: 0, type: "GIG_CANCEL_REFUND", title: "Gig cancelled — refund", body: `Credit: ₦${(refund/100).toLocaleString()} refunded for gig #${id}${isAdmin ? " (admin free — no fee)" : ` (fee ₦${(cancelFee/100).toLocaleString()} retained)`}.`, meta: { gigId: id, fee: cancelFee, adminFree: isAdmin } });
    } catch {}
    return res.json({ message: isAdmin ? `Cancelled (admin free) — refund ₦${(refund/100).toLocaleString()} to Gig wallet.` : `Cancelled — 5% fee ₦${(cancelFee/100).toLocaleString()}, refund ₦${(refund/100).toLocaleString()} to Gig wallet.`, refund, fee: cancelFee });
  } catch (err) {
    if (err.message === "ALREADY") return res.status(409).json({ error: `Cannot cancel` });
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
    try {
      const { recordWalletMovement } = require("../utils/wallet");
      await recordWalletMovement({ userId: gig.posterId, direction: "CREDIT", amount: gig.escrowAmount, fee: 0, type: "GIG_EXPIRED_REFUND", title: "Expired gig — refund", body: `Credit: ₦${(gig.escrowAmount/100).toLocaleString()} refunded for expired gig #${id}.`, meta: { gigId: id } });
    } catch {}
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
    const { reason, description } = req.body;
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId !== req.user.id && gig.claimerId !== req.user.id) return res.status(403).json({ error: "Only poster or claimer can dispute" });
    if (gig.status !== "CLAIMED") return res.status(400).json({ error: "Only claimed can be disputed" });
    const updated = await prisma.gig.update({ where: { id }, data: { status: "DISPUTED" } });
    try {
      const otherId = req.user.id === gig.posterId ? gig.claimerId : gig.posterId;
      if (otherId) {
        await prisma.notification.create({ data: { userId: otherId, actorId: req.user.id, type: "GIG_DISPUTED", listingId: null } });
        const { emitNotification } = require("../realtime");
        emitNotification(otherId, { type: "GIG_DISPUTED" });
      }
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      for (const a of admins) {
        await prisma.notification.create({ data: { userId: a.id, actorId: req.user.id, type: "GIG_DISPUTED_ADMIN", listingId: null } }).catch(()=>{});
        const { sendPushToUser } = require("../utils/push");
        const { emitNotification } = require("../realtime");
        sendPushToUser(prisma, a.id, { title: "New gig dispute", body: `Gig #${id} — ${reason || "disputed"}`, url: "/admin/disputes", tag: `gig-dispute-${id}` }).catch(()=>{});
        try { emitNotification(a.id, { type: "GIG_DISPUTED_ADMIN" }); } catch {}
      }
    } catch {}
    return res.json({ gig: updated, message: "Disputed — admin will review, auto-release paused. Provide reason and proof in admin chat." });
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
    const isAdmin = req.user.role === "ADMIN";
    const kobo = amt * 100;
    let feeKobo = isAdmin ? 0 : Math.round(kobo * 0.01); // 1% — admin free
    if (!isAdmin && feeKobo === 0 && kobo > 0) feeKobo = 1;
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
    // Deduct immediately from gig balance + save withdrawal as In review (PENDING) + profit 1%
    const w = await prisma.$transaction(async (tx) => {
      const ok = await tx.user.updateMany({ where: { id: req.user.id, gigBalance: { gte: totalKobo } }, data: { gigBalance: { decrement: totalKobo } } });
      if (ok.count === 0) throw new Error("BALANCE_RACE");
      await tx.user.update({ where: { id: req.user.id }, data: { bankAccountNumber: cleanAcc, bankCode: cleanBank, bankName: bankName || cleanBank } });
      const wd = await tx.gigWithdrawal.create({ data: { userId: req.user.id, amount: kobo, fee: feeKobo, bankCode: cleanBank, bankAccountNumber: cleanAcc, bankName: bankName || cleanBank, accountName, reference, status: "PENDING" } });
      if (!isAdmin && feeKobo > 0) await tx.platformProfit.create({ data: { source: "GIG_WITHDRAW_1P", grossFee: feeKobo, netFee: feeKobo, refId: wd.reference, meta: { withdrawalId: wd.id, amount: kobo } } });
      return wd;
    });
    // ledger for history
    try {
      const { recordWalletMovement } = require("../utils/wallet");
      await recordWalletMovement({ userId: req.user.id, direction: "DEBIT", amount: kobo, fee: feeKobo, type: "WITHDRAW", title: "Withdrawal — in review", body: `Debit: ₦${(totalKobo/100).toLocaleString()} (₦${amt.toLocaleString()} + fee ₦${(feeKobo/100).toFixed(2)}) to ${bankName || cleanBank} • ${cleanAcc} — ref ${reference} — In review`, meta: { withdrawalId: w.id, reference } });
    } catch {}
    // inbox + push + notification for debit (red) — request received + admin push for pending
    try {
      await prisma.notification.create({ data: { userId: req.user.id, actorId: req.user.id, type: "GIG_WITHDRAW_PENDING", listingId: null } });
      await prisma.message.create({ data: { senderId: req.user.id, recipientId: req.user.id, subject: "Gig Withdrawal Requested — In review", body: `Withdrawal ₦${amt.toLocaleString()} (fee ₦${(feeKobo/100).toFixed(2)}) to ${bankName || cleanBank} • ${cleanAcc} — ref ${reference} — In review, awaiting admin approval. ₦${(totalKobo/100).toLocaleString()} debited from Gig wallet.` } });
      const { sendPushToUser } = require("../utils/push");
      const { emitNotification, isOnline } = require("../realtime");
      if (!isOnline(req.user.id)) sendPushToUser(prisma, req.user.id, { title: "Gig Wallet — Withdrawal in review", body: `₦${amt.toLocaleString()} to ${bankName || cleanBank} — in review, ₦${(totalKobo/100).toLocaleString()} debited`, url: "/gigs/wallet", tag: `gig-wd-${reference}` }).catch(()=>{});
      try { emitNotification(req.user.id, { type: "GIG_WITHDRAW_PENDING" }); } catch {}
      // admin push for pending approval
      try {
        const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
        for (const a of admins) {
          if (!isOnline(a.id)) sendPushToUser(prisma, a.id, { title: "New withdrawal to approve", body: `₦${amt.toLocaleString()} from @${(await prisma.user.findUnique({where:{id:req.user.id}, select:{username:true}}))?.username} — In review`, url: "/admin/withdrawals", tag: `admin-wd-${reference}` }).catch(()=>{});
          await prisma.notification.create({ data: { userId: a.id, actorId: req.user.id, type: "ADMIN_WITHDRAW_PENDING", listingId: null } }).catch(()=>{});
          try { emitNotification(a.id, { type: "ADMIN_WITHDRAW_PENDING" }); } catch {}
        }
      } catch {}
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
    // Manual confirm — no Flutterwave transfer (removed per request). Mark COMPLETED + same push/inbox.
    await prisma.gigWithdrawal.update({ where: { id }, data: { status: "COMPLETED" } });
    try {
      await prisma.notification.create({ data: { userId: w.userId, type: "GIG_WITHDRAW_COMPLETED", listingId: null } });
      await prisma.message.create({ data: { senderId: w.userId, recipientId: w.userId, subject: "Gig Withdrawal Completed", body: `Withdrawal ₦${(w.amount/100).toLocaleString()} (fee ₦${(w.fee/100).toFixed(2)}) to ${w.bankName} • ${w.bankAccountNumber} — COMPLETED. ₦${(totalKobo/100).toLocaleString()} already debited on request — ref ${w.reference}.` } });
      const { sendPushToUser } = require("../utils/push");
      const { emitNotification } = require("../realtime");
      sendPushToUser(prisma, w.userId, { title: "Gig Wallet — Withdrawal completed", body: `₦${(w.amount/100).toLocaleString()} sent to your bank`, url: "/gigs/wallet", tag: `gig-wd-c-${w.reference}` }).catch(()=>{});
      try { emitNotification(w.userId, { type: "GIG_WITHDRAW_COMPLETED" }); } catch {}
    } catch {}
    return res.json({ message: "Confirmed — payout marked completed (manual/bank app)", manual: true });
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
    // Already debited on request (amount + fee) — reject refunds all deducted (principal + fee)
    const totalKobo = w.amount + (w.fee || 0);
    const feeKobo = w.fee || 0;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: w.userId }, data: { gigBalance: { increment: totalKobo } } });
      await tx.gigWithdrawal.update({ where: { id }, data: { status: "REJECTED" } });
      // reverse platform profit (fee) since all sent back
      await tx.platformProfit.deleteMany({ where: { refId: w.reference, source: "GIG_WITHDRAW_1P" } }).catch(()=>{});
    });
    try {
      const { recordWalletMovement } = require("../utils/wallet");
      await recordWalletMovement({ userId: w.userId, direction: "CREDIT", amount: totalKobo, fee: 0, type: "WITHDRAW_REFUND", title: "Withdrawal rejected — refunded", body: `Credit: ₦${(totalKobo/100).toLocaleString()} refunded (withdrawal rejected — ref ${w.reference}).`, meta: { withdrawalId: w.id, reference: w.reference } });
    } catch {}
    try {
      await prisma.notification.create({ data: { userId: w.userId, type: "GIG_WITHDRAW_REJECTED", listingId: null } });
      await prisma.message.create({ data: { senderId: w.userId, recipientId: w.userId, subject: "Gig Withdrawal Rejected — Fully Refunded", body: `Withdrawal ₦${(w.amount/100).toLocaleString()} — REJECTED — ₦${(totalKobo/100).toLocaleString()} fully refunded to Gig wallet (was ₦${(w.amount/100).toLocaleString()} + fee ₦${(feeKobo/100).toFixed(2)} = ₦${(totalKobo/100).toLocaleString()} debited) — ref ${w.reference}.` } });
      const { sendPushToUser } = require("../utils/push");
      const { emitNotification } = require("../realtime");
      sendPushToUser(prisma, w.userId, { title: "Gig Wallet — Withdrawal rejected", body: `₦${(w.amount/100).toLocaleString()} rejected — ₦${(totalKobo/100).toLocaleString()} fully refunded`, url: "/gigs/wallet", tag: `gig-wd-r-${w.reference}` }).catch(()=>{});
      try { emitNotification(w.userId, { type: "GIG_WITHDRAW_REJECTED" }); } catch {}
    } catch {}
    return res.json({ message: `Rejected — ₦${(totalKobo/100).toLocaleString()} fully refunded.` });
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
      await tx.user.update({ where: { id: w.userId }, data: { gigBalance: { increment: totalKobo } } });
      await tx.gigWithdrawal.update({ where: { id }, data: { status: "CANCELLED" } });
      await tx.platformProfit.deleteMany({ where: { refId: w.reference, source: "GIG_WITHDRAW_1P" } }).catch(()=>{});
    });
    try {
      const { recordWalletMovement } = require("../utils/wallet");
      await recordWalletMovement({ userId: w.userId, direction: "CREDIT", amount: totalKobo, fee: 0, type: "WITHDRAW_REFUND", title: "Withdrawal cancelled — refunded", body: `Credit: ₦${(totalKobo/100).toLocaleString()} refunded (withdrawal cancelled — ref ${w.reference}).`, meta: { withdrawalId: w.id, reference: w.reference } });
    } catch {}
    try {
      await prisma.notification.create({ data: { userId: w.userId, type: "GIG_WITHDRAW_CANCELLED", listingId: null } });
      await prisma.message.create({ data: { senderId: w.userId, recipientId: w.userId, subject: "Gig Withdrawal Cancelled — Fully Refunded", body: `Withdrawal ₦${(w.amount/100).toLocaleString()} — CANCELLED — ₦${(totalKobo/100).toLocaleString()} fully refunded to Gig wallet (was ₦${(w.amount/100).toLocaleString()} + fee ₦${(feeKobo/100).toFixed(2)} = ₦${(totalKobo/100).toLocaleString()} debited) — ref ${w.reference}.` } });
      const { sendPushToUser } = require("../utils/push");
      const { emitNotification } = require("../realtime");
      sendPushToUser(prisma, w.userId, { title: "Gig Wallet — Withdrawal cancelled", body: `₦${(w.amount/100).toLocaleString()} cancelled — ₦${(totalKobo/100).toLocaleString()} fully refunded`, url: "/gigs/wallet", tag: `gig-wd-cnl-${w.reference}` }).catch(()=>{});
      try { emitNotification(w.userId, { type: "GIG_WITHDRAW_CANCELLED" }); } catch {}
    } catch {}
    return res.json({ message: `Cancelled — ₦${(totalKobo/100).toLocaleString()} fully refunded.` });
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
    const isAdminTransfer = req.user.role === "ADMIN";
    const amountKobo = amt * 100;
    let feeKobo = isAdminTransfer ? 0 : Math.round(amountKobo * 0.01); // 1% — admin free
    if (!isAdminTransfer && feeKobo === 0 && amountKobo > 0) feeKobo = 1; // min 1 kobo
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
      const tr = await tx.gigTransfer.create({ data: { fromUserId: req.user.id, toUserId: recipient.id, amount: amountKobo, fee: feeKobo, status: "SUCCESS" } });
      if (!isAdminTransfer && feeKobo > 0) await tx.platformProfit.create({ data: { source: "GIG_TRANSFER_1P", grossFee: feeKobo, netFee: feeKobo, refId: tr.reference, meta: { transferId: tr.id, from: req.user.id, to: recipient.id } } });
      return tr;
    });
    // ledger + history for both sides
    try {
      const { recordWalletMovement } = require("../utils/wallet");
      await Promise.all([
        recordWalletMovement({ userId: req.user.id, direction: "DEBIT", amount: amountKobo, fee: feeKobo, type: "TRANSFER", title: `Transfer sent to @${recipient.username}`, body: `Debit: ₦${(totalKobo/100).toLocaleString()} sent to @${recipient.username} (amount ₦${amt.toLocaleString()} + fee ₦${(feeKobo/100).toFixed(2)}) — ref ${transfer.reference}`, meta: { transferId: transfer.id, toUserId: recipient.id, reference: transfer.reference } }),
        recordWalletMovement({ userId: recipient.id, direction: "CREDIT", amount: amountKobo, fee: 0, type: "TRANSFER", title: "Transfer received", body: `Credit: ₦${amt.toLocaleString()} received from @${(await prisma.user.findUnique({where:{id:req.user.id},select:{username:true}}))?.username} — ref ${transfer.reference}`, meta: { transferId: transfer.id, fromUserId: req.user.id, reference: transfer.reference } }),
      ]);
    } catch {}
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

const getWalletHistory = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const userId = req.user.id;

    // Fetch ledger + legacy sources in parallel (cap 100 each to keep merge manageable)
    const [ledger, sent, received, topups, withdrawals, tokenBuysRaw, gigsPosted, gigsClaimed, bookingsAsBooker, bookingsAsProvider] = await Promise.all([
      prisma.gigWalletTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.gigTransfer.findMany({ where: { fromUserId: userId }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.gigTransfer.findMany({ where: { toUserId: userId }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.gigTokenPurchase.findMany({ where: { userId, status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.gigWithdrawal.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.tokenPurchase.findMany({ where: { userId, status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.gig.findMany({ where: { posterId: userId }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.gig.findMany({ where: { claimerId: userId }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.serviceBooking.findMany({ where: { bookerId: userId }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.serviceBooking.findMany({ where: { providerId: userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);

    const ledgerRefs = new Set(ledger.map(l => l.reference).filter(Boolean));
    const ledgerGigIds = new Set(ledger.filter(l => l.meta && l.meta.gigId).map(l => String(l.meta.gigId)));
    const ledgerBookingIds = new Set(ledger.filter(l => l.meta && l.meta.bookingId).map(l => String(l.meta.bookingId)));
    const ledgerTransferRefs = new Set(ledger.filter(l => l.type === "TRANSFER").map(l => l.meta && (l.meta.reference || l.reference)).filter(Boolean));

    const norm = [];

    // ledger entries as-is (already correct shape) — normalize to unified shape for sorting
    for (const tx of ledger) {
      norm.push({
        id: `ledger-${tx.id}`,
        ledgerId: tx.id,
        direction: tx.direction, // CREDIT|DEBIT
        type: tx.type,
        amount: tx.amount,
        fee: tx.fee,
        total: tx.total,
        reference: tx.reference,
        createdAt: tx.createdAt,
        meta: tx.meta,
        source: "ledger",
      });
    }

    // legacy transfers not yet in ledger
    for (const t of sent) {
      if (ledgerTransferRefs.has(t.reference)) continue;
      norm.push({ id: `tr-sent-${t.id}`, direction: "DEBIT", type: "TRANSFER", amount: t.amount, fee: t.fee, total: t.amount + t.fee, reference: t.reference, createdAt: t.createdAt, meta: { transferId: t.id, toUserId: t.toUserId }, source: "transfer" });
    }
    for (const t of received) {
      if (ledgerTransferRefs.has(t.reference)) continue;
      norm.push({ id: `tr-recv-${t.id}`, direction: "CREDIT", type: "TRANSFER", amount: t.amount, fee: 0, total: t.amount, reference: t.reference, createdAt: t.createdAt, meta: { transferId: t.id, fromUserId: t.fromUserId }, source: "transfer" });
    }

    // topups (gig token purchases)
    for (const p of topups) {
      if (ledgerRefs.has(p.reference)) continue;
      norm.push({ id: `topup-${p.id}`, direction: "CREDIT", type: "TOPUP", amount: p.amount, fee: 0, total: p.amount, reference: p.reference, createdAt: p.createdAt, meta: { purchaseId: p.id }, source: "topup" });
    }

    // withdrawals
    for (const w of withdrawals) {
      const total = w.amount + (w.fee || 0);
      if (w.status === "REJECTED" || w.status === "CANCELLED") {
        if (ledgerRefs.has(w.reference)) continue;
        // ledger for these would be WITHDRAW_REFUND, but legacy path is refund credit
        norm.push({ id: `wd-refund-${w.id}`, direction: "CREDIT", type: "WITHDRAW_REFUND", amount: total, fee: 0, total, reference: w.reference, createdAt: w.updatedAt || w.createdAt, meta: { withdrawalId: w.id, status: w.status }, source: "withdrawal" });
      } else {
        if (ledgerRefs.has(w.reference)) continue;
        norm.push({ id: `wd-${w.id}`, direction: "DEBIT", type: "WITHDRAW", amount: w.amount, fee: w.fee || 0, total, reference: w.reference, createdAt: w.createdAt, meta: { withdrawalId: w.id, status: w.status }, source: "withdrawal" });
      }
    }

    // token buys via gig balance (legacy before ledger)
    for (const tp of tokenBuysRaw) {
      const via = tp.meta && (tp.meta.via === "GIG_BALANCE" || tp.meta.via === "GIG_BALANCE" || (tp.flutterwaveTransactionId && tp.flutterwaveTransactionId.startsWith("gig_")));
      // also check if amount matches token logic: if flutter ref starts with gig_ it's via gig
      const isViaGig = via || (tp.reference && tp.reference.startsWith("gig_"));
      if (!isViaGig) continue;
      if (ledgerRefs.has(tp.reference)) continue;
      const costKobo = tp.quantity * 200 * 100;
      norm.push({ id: `tokenbuy-${tp.id}`, direction: "DEBIT", type: "TOKEN_BUY", amount: costKobo, fee: 0, total: costKobo, reference: tp.reference, createdAt: tp.createdAt, meta: { tokenPurchaseId: tp.reference, quantity: tp.quantity }, source: "tokenBuy" });
    }

    // gigs posted — derive escrow held (only if not already in ledger)
    for (const g of gigsPosted) {
      if (ledgerGigIds.has(String(g.id))) continue;
      // escrow debit at creation
      norm.push({ id: `gig-create-${g.id}`, direction: "DEBIT", type: "GIG_CREATE", amount: g.escrowAmount || g.amount, fee: 0, total: g.escrowAmount || g.amount, reference: `gig-${g.id}-create`, createdAt: g.createdAt, meta: { gigId: g.id }, source: "gig" });
      // cancel refund (5%) — if CANCELLED and not expired refund path, derive from updatedAt
      if (g.status === "CANCELLED") {
        // Check if ledger already has refund for this gig (any type with gigId)
        const hasRefund = ledger.some(l => l.meta && String(l.meta.gigId) === String(g.id) && (l.type.includes("REFUND") || l.type === "GIG_CANCEL_REFUND" || l.type === "GIG_EXPIRED_REFUND"));
        if (!hasRefund) {
          // distinguish expired vs cancel: if expiresAt < updatedAt and not claimed, it's expired refund full; else 5% fee
          const isExpired = g.expiresAt && g.updatedAt && new Date(g.updatedAt) > new Date(g.expiresAt) && !g.claimerId;
          if (isExpired) {
            norm.push({ id: `gig-exp-refund-${g.id}`, direction: "CREDIT", type: "GIG_EXPIRED_REFUND", amount: g.escrowAmount || g.amount, fee: 0, total: g.escrowAmount || g.amount, reference: `gig-${g.id}-expired`, createdAt: g.updatedAt, meta: { gigId: g.id }, source: "gig" });
          } else {
            const fee = Math.floor((g.escrowAmount || g.amount) * 0.05);
            const refund = (g.escrowAmount || g.amount) - fee;
            norm.push({ id: `gig-cancel-refund-${g.id}`, direction: "CREDIT", type: "GIG_CANCEL_REFUND", amount: refund, fee: 0, total: refund, reference: `gig-${g.id}-cancel`, createdAt: g.updatedAt, meta: { gigId: g.id, fee }, source: "gig" });
          }
        }
      }
    }

    // gigs claimed — payouts to claimer
    for (const g of gigsClaimed) {
      if (g.status !== "COMPLETED") continue;
      if (ledgerGigIds.has(String(g.id))) continue;
      const pay = (g.escrowAmount || g.amount) - Math.floor((g.escrowAmount || g.amount) * 0.2);
      const fee = Math.floor((g.escrowAmount || g.amount) * 0.2);
      norm.push({ id: `gig-payout-${g.id}`, direction: "CREDIT", type: "GIG_PAYOUT", amount: pay, fee: 0, total: pay, reference: `gig-${g.id}-payout`, createdAt: g.completedAt || g.updatedAt, meta: { gigId: g.id, fee }, source: "gig" });
    }

    // service bookings as booker — book debit, refund credit if cancelled/expired
    for (const b of bookingsAsBooker) {
      if (ledgerBookingIds.has(String(b.id))) continue;
      // book debit at creation if not already ledger
      const hasBook = ledger.some(l => l.meta && String(l.meta.bookingId) === String(b.id) && l.type === "SERVICE_BOOK");
      if (!hasBook) {
        norm.push({ id: `sb-book-${b.id}`, direction: "DEBIT", type: "SERVICE_BOOK", amount: b.amount, fee: 0, total: b.amount, reference: `sb-${b.id}-book`, createdAt: b.createdAt, meta: { bookingId: b.id }, source: "service" });
      }
      if (b.status === "CANCELLED" || b.status === "EXPIRED") {
        const hasRefund = ledger.some(l => l.meta && String(l.meta.bookingId) === String(b.id) && (l.type === "SERVICE_REFUND" || l.type === "SERVICE_EXPIRED_REFUND"));
        if (!hasRefund) {
          norm.push({ id: `sb-refund-${b.id}`, direction: "CREDIT", type: b.status === "EXPIRED" ? "SERVICE_EXPIRED_REFUND" : "SERVICE_REFUND", amount: b.amount, fee: 0, total: b.amount, reference: `sb-${b.id}-refund`, createdAt: b.updatedAt, meta: { bookingId: b.id }, source: "service" });
        }
      }
    }

    // service bookings as provider — fee debit, payout credit
    for (const b of bookingsAsProvider) {
      if (b.status === "CONFIRMED" || b.status === "COMPLETED" || b.status === "DISPUTED") {
        const hasFee = ledger.some(l => l.meta && String(l.meta.bookingId) === String(b.id) && l.type === "SERVICE_FEE");
        if (!hasFee) {
          const fee = Math.floor(b.amount * 0.2);
          norm.push({ id: `sb-fee-${b.id}`, direction: "DEBIT", type: "SERVICE_FEE", amount: fee, fee: 0, total: fee, reference: `sb-${b.id}-fee`, createdAt: b.updatedAt, meta: { bookingId: b.id, fee }, source: "service" });
        }
      }
      if (b.status === "COMPLETED") {
        const hasPayout = ledger.some(l => l.meta && String(l.meta.bookingId) === String(b.id) && l.type === "SERVICE_PAYOUT");
        if (!hasPayout) {
          // only provider gets payout, avoid duplicate if booker also has same booking completed but not payout
          norm.push({ id: `sb-payout-${b.id}`, direction: "CREDIT", type: "SERVICE_PAYOUT", amount: b.amount, fee: 0, total: b.amount, reference: `sb-${b.id}-payout`, createdAt: b.updatedAt, meta: { bookingId: b.id }, source: "service" });
        }
      }
    }

    // sort by createdAt desc
    norm.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalCount = norm.length;
    const sliced = norm.slice(skip, skip + limitNum);

    return res.json({ transactions: sliced, pagination: { totalCount, totalPages: Math.ceil(totalCount / limitNum), currentPage: pageNum, limit: limitNum } });
  } catch (err) {
    console.error("[GET WALLET HISTORY ERROR]", err);
    return res.status(500).json({ error: "Could not load wallet history" });
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
      // Admin posters are free — no profit, 100% payout
      let isPosterAdmin = false;
      try {
        const poster = await prisma.user.findUnique({ where: { id: g.posterId }, select: { role: true } });
        isPosterAdmin = poster?.role === "ADMIN";
      } catch {}
      const gross = isPosterAdmin ? 0 : fee(g.escrowAmount);
      const pay = isPosterAdmin ? g.escrowAmount : payout(g.escrowAmount);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: g.claimerId }, data: { gigBalance: { increment: pay } } });
        await tx.gig.update({ where: { id: g.id }, data: { status: "COMPLETED", completedAt: new Date() } });
        if (!isPosterAdmin) await tx.platformProfit.create({ data: { source: "GIG_CONFIRM_20", grossFee: gross, netFee: gross, refId: String(g.id), meta: { gigId: g.id, autoReleased: true } } });
      });
      console.log(`[GIGS] Auto-released gig ${g.id} → ₦${pay/100} to ${g.claimerId}${isPosterAdmin ? " (admin free)" : ` fee ₦${gross/100}`}`);
      try {
        const { recordWalletMovement } = require("../utils/wallet");
        await recordWalletMovement({ userId: g.claimerId, direction: "CREDIT", amount: pay, fee: 0, type: "GIG_AUTO_RELEASE", title: "Gig auto-released — credited", body: `Credit: ₦${(pay/100).toLocaleString()} auto-released for gig #${g.id}${isPosterAdmin ? " (admin free — no fee)" : ` (fee ₦${(gross/100).toLocaleString()} retained)`} — 72h`, meta: { gigId: g.id, autoReleased: true, adminFree: isPosterAdmin } });
      } catch {}
    }
  } catch (e) { console.error("[GIGS AUTORELEASE ERROR]", e.message); }
};

module.exports = { createGig, listGigs, myGigs, claimGig, confirmGig, cancelGig, renewGig, refundExpired, disputeGig, withdrawGig, getGigAccount, resolveGigAccount, transferGig, listGigTransfers, listMyGigWithdrawals, listMyGigPurchases, getWalletHistory, setGigPin, requestPinOtp, hasGigPin, setBank, resolveBank, getBanks, listGigWithdrawals, approveGigWithdrawal, rejectGigWithdrawal, cancelGigWithdrawal, expireGigs, autoReleaseGigs };
