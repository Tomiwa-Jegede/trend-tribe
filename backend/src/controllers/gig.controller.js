// src/controllers/gig.controller.js — Gigs escrow (Naira, 80/20, 5% cancel, 72h auto-release)
const prisma = require("../db");

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

// POST /api/gigs/:id/claim — free, no fee on claim
const claimGig = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid gig id" });
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId === req.user.id) return res.status(400).json({ error: "You cannot claim your own gig" });
    if (gig.status !== "OPEN") return res.status(400).json({ error: `Gig is ${gig.status}, not open` });
    if (gig.expiresAt < new Date()) return res.status(400).json({ error: "Gig expired" });

    const updated = await prisma.gig.update({ where: { id }, data: { status: "CLAIMED", claimerId: req.user.id, claimedAt: new Date() } });
    return res.json({ gig: updated, whatsapp: gig.whatsapp, message: "Claimed — you got the poster's WhatsApp, coordinate off-platform. Poster must Confirm within 72h." });
  } catch (err) {
    console.error("[CLAIM GIG ERROR]", err);
    return res.status(500).json({ error: "Could not claim" });
  }
};

// POST /api/gigs/:id/confirm — poster confirms, 80% to claimer, 20% fee retained
const confirmGig = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId !== req.user.id) return res.status(403).json({ error: "Only poster can confirm" });
    if (gig.status !== "CLAIMED") return res.status(400).json({ error: `Gig is ${gig.status}` });
    if (!gig.claimerId) return res.status(400).json({ error: "No claimer" });

    const pay = payout(gig.escrowAmount);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: gig.claimerId }, data: { gigBalance: { increment: pay } } });
      await tx.gig.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
    });
    return res.json({ message: `Confirmed — ₦${(pay/100).toLocaleString()} sent to claimer, ₦${(fee(gig.escrowAmount)/100).toLocaleString()} fee retained.`, payout: pay, fee: fee(gig.escrowAmount) });
  } catch (err) {
    console.error("[CONFIRM GIG ERROR]", err);
    return res.status(500).json({ error: "Could not confirm" });
  }
};

// POST /api/gigs/:id/cancel — poster cancels before claimed: 5% fee, 95% refund
const cancelGig = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gig = await prisma.gig.findUnique({ where: { id } });
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.posterId !== req.user.id) return res.status(403).json({ error: "Only poster can cancel" });
    if (gig.status !== "OPEN") return res.status(400).json({ error: `Cannot cancel ${gig.status} gig. After claimed, use Confirm/Dispute.` });

    const cancelFee = Math.floor(gig.escrowAmount * 0.05);
    const refund = gig.escrowAmount - cancelFee;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: gig.posterId }, data: { gigBalance: { increment: refund } } });
      await tx.gig.update({ where: { id }, data: { status: "CANCELLED" } });
    });
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

// POST /api/gigs/withdraw — claimer withdraws gigBalance to WhatsApp money
const withdrawGig = async (req, res) => {
  try {
    const { amount, whatsapp } = req.body;
    const amt = parseInt(amount, 10);
    if (!amt || amt < 1000) return res.status(400).json({ error: "Minimum withdraw ₦1000" });
    const kobo = amt * 100;
    if (!whatsapp?.trim() || !/^(\+234|0)[789][01]\d{8}$/.test(whatsapp.trim())) return res.status(400).json({ error: "Valid WhatsApp required" });
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigBalance: true } });
    if (!user || user.gigBalance < kobo) return res.status(402).json({ error: `Insufficient Gig balance ₦${((user?.gigBalance||0)/100).toLocaleString()}` });
    const w = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: req.user.id }, data: { gigBalance: { decrement: kobo } } });
      return tx.gigWithdrawal.create({ data: { userId: req.user.id, amount: kobo, whatsapp: whatsapp.trim(), status: "PENDING" } });
    });
    return res.status(201).json({ withdrawal: w, message: "Withdraw request created — admin will pay to your WhatsApp number." });
  } catch (err) {
    console.error("[WITHDRAW GIG ERROR]", err);
    return res.status(500).json({ error: "Could not withdraw" });
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
    const { toAccountNumber, amount } = req.body;
    if (!toAccountNumber || !/^\d{10}$/.test(toAccountNumber.trim())) return res.status(400).json({ error: "Recipient account must be 10 digits" });
    const amt = parseInt(amount, 10);
    if (!amt || amt < 1) return res.status(400).json({ error: "Amount must be at least ₦1" });
    const amountKobo = amt * 100;
    const feeKobo = amt > 10000 ? 10000 : 5000; // 100 above 10k, else 50
    const totalKobo = amountKobo + feeKobo;

    const recipient = await prisma.user.findUnique({ where: { gigAccountNumber: toAccountNumber.trim() }, select: { id: true, fullName: true, username: true } });
    if (!recipient) return res.status(404).json({ error: "Recipient account not found" });
    if (recipient.id === req.user.id) return res.status(400).json({ error: "Cannot transfer to yourself" });

    const sender = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigBalance: true, gigAccountNumber: true } });
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

module.exports = { createGig, listGigs, myGigs, claimGig, confirmGig, cancelGig, renewGig, refundExpired, disputeGig, withdrawGig, getGigAccount, resolveGigAccount, transferGig, listGigTransfers, expireGigs, autoReleaseGigs };
