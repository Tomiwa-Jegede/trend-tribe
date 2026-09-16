// src/controllers/serviceBooking.controller.js — SERVICES booking: 1h timer, 20% provider fee on Confirm, escrow-like flow
const prisma = require("../db");

const BOOKING_EXPIRE_HOURS = 1;

const bookService = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id || req.params.listingId, 10);
    if (isNaN(listingId)) return res.status(400).json({ error: "Invalid listing id" });
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: "Service not found" });
    if (listing.category !== "SERVICES") return res.status(400).json({ error: "Only SERVICES can be booked" });
    if (!listing.isAvailable) return res.status(400).json({ error: "Service not available" });
    if (listing.sellerId === req.user.id) return res.status(400).json({ error: "You cannot book your own service" });
    if (parseFloat(listing.price) > 50000) return res.status(400).json({ error: "Service price must be ≤ ₦50,000" });

    const amountKobo = Math.round(parseFloat(listing.price) * 100);
    const expiresAt = new Date(Date.now() + BOOKING_EXPIRE_HOURS * 60 * 60 * 1000);

    // For SERVICES, escrow is whole amount from booker's Gig wallet (Naira kobo)
    const booker = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigBalance: true } });
    if ((booker?.gigBalance || 0) < amountKobo) {
      return res.status(402).json({ error: `Insufficient Gig balance. Need ₦${(amountKobo/100).toLocaleString()} in Gig wallet to book. You have ₦${((booker?.gigBalance||0)/100).toLocaleString()}. Please fund your Gig wallet.`, requiredKobo: amountKobo, gigBalance: booker?.gigBalance||0 });
    }

    const booking = await prisma.$transaction(async (tx) => {
      const ok = await tx.user.updateMany({ where: { id: req.user.id, gigBalance: { gte: amountKobo } }, data: { gigBalance: { decrement: amountKobo } } });
      if (ok.count === 0) throw new Error("BALANCE_RACE");
      const b = await tx.serviceBooking.create({
        data: { listingId, bookerId: req.user.id, providerId: listing.sellerId, amount: amountKobo, status: "PENDING", expiresAt },
      });
      const { recordWalletMovement } = require("../utils/wallet");
      await recordWalletMovement({ userId: req.user.id, direction: "DEBIT", amount: amountKobo, fee: 0, type: "SERVICE_BOOK", title: "Service booked — escrow held", body: `Debit: ₦${(amountKobo/100).toLocaleString()} held for service booking #${b.id} — escrow from Gig wallet.`, meta: { bookingId: b.id, listingId }, tx });
      return b;
    });

    try {
      await prisma.notification.create({ data: { userId: listing.sellerId, actorId: req.user.id, listingId, type: "SERVICE_BOOKING" } });
      const { emitNotification, isOnline } = require("../realtime");
      emitNotification(listing.sellerId, { type: "SERVICE_BOOKING", listingId });
      if (!isOnline(listing.sellerId)) {
        const { sendPushToUser } = require("../utils/push");
        sendPushToUser(prisma, listing.sellerId, { title: "New service booking", body: `New booking for ${listing.title?.slice(0,60) || "service"} — tap to confirm`, url: "/bookings/provider", tag: `booking-${booking.id}` }).catch(()=>{});
      }
    } catch {}

    return res.status(201).json({ booking, message: `Booked — ₦${(amountKobo/100).toLocaleString()} held from Gig wallet. Provider has 1 hour to confirm.` });
  } catch (err) {
    if (err.message.includes("TOKEN")) return res.status(402).json({ error: "Balance changed" });
    console.error("[BOOK SERVICE ERROR]", err);
    return res.status(500).json({ error: "Could not book service" });
  }
};

const confirmServiceBooking = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const booking = await prisma.serviceBooking.findUnique({ where: { id }, include: { listing: true } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.providerId !== req.user.id) return res.status(403).json({ error: "Only provider can confirm" });
    if (booking.status !== "PENDING") return res.status(400).json({ error: `Booking is ${booking.status}` });
    if (booking.expiresAt < new Date()) return res.status(400).json({ error: "Booking expired (1h)" });

    const isAdminProvider = req.user.role === "ADMIN";
    const feeKobo = isAdminProvider ? 0 : Math.floor(booking.amount * 0.2);
    const provider = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigBalance: true } });
    if (!isAdminProvider && (provider?.gigBalance || 0) < feeKobo) return res.status(402).json({ error: `Insufficient Gig balance for 20% fee. Need ₦${(feeKobo/100).toLocaleString()} in Gig wallet. You have ₦${((provider?.gigBalance||0)/100).toLocaleString()}. Please fund your Gig wallet.`, feeKobo });

    const { recordWalletMovement } = require("../utils/wallet");
    await prisma.$transaction(async (tx) => {
      // Atomic guard: only one concurrent confirm can flip PENDING -> CONFIRMED. Without
      // this, two rapid taps both pass the earlier (stale, pre-transaction) PENDING check
      // and both go on to decrement the fee below — double fee-deduction.
      const bookOk = await tx.serviceBooking.updateMany({ where: { id, status: "PENDING" }, data: { status: "CONFIRMED" } });
      if (bookOk.count === 0) throw new Error("ALREADY_CONFIRMED");
      if (!isAdminProvider) {
        const ok = await tx.user.updateMany({ where: { id: req.user.id, gigBalance: { gte: feeKobo } }, data: { gigBalance: { decrement: feeKobo } } });
        if (ok.count === 0) throw new Error("FEE_RACE");
        await tx.platformProfit.create({ data: { source: "SERVICE_CONFIRM_20", grossFee: feeKobo, netFee: feeKobo, refId: String(id), meta: { bookingId: id, listingId: booking.listingId } } });
        // ledger debit for provider fee, atomic with the deduction above — admin free skips
        await recordWalletMovement({ userId: req.user.id, direction: "DEBIT", amount: feeKobo, fee: 0, type: "SERVICE_FEE", title: "Service confirm fee — 20%", body: `Debit: ₦${(feeKobo/100).toLocaleString()} fee for confirming booking #${id} — debited from Gig wallet.`, meta: { bookingId: id }, tx });
      }
      // Keep escrow held — do NOT refund booker yet. Booker paid at booking time, funds stay in escrow until service completed.
    });

    // Notify booker with provider whatsapp — escrow still held
    const providerUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { whatsapp: true } });
    try {
      await prisma.notification.create({ data: { userId: booking.bookerId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_CONFIRMED" } });
      const { emitNotification, isOnline } = require("../realtime");
      emitNotification(booking.bookerId, { type: "SERVICE_CONFIRMED", listingId: booking.listingId });
      if (!isOnline(booking.bookerId)) {
        const { sendPushToUser } = require("../utils/push");
        sendPushToUser(prisma, booking.bookerId, { title: "Service confirmed", body: `Provider confirmed booking #${id} — WhatsApp unlocked, service pending`, url: "/bookings/mine", tag: `confirm-${id}` }).catch(()=>{});
      }
    } catch {}

    return res.json({ message: `Confirmed — escrow still held (₦${(booking.amount/100).toLocaleString()}), booker gets your WhatsApp. Mark as completed after service to release funds.`, whatsapp: providerUser?.whatsapp, feeKobo });
  } catch (err) {
    if (err.message === "ALREADY_CONFIRMED") return res.status(400).json({ error: "Booking was already confirmed" });
    if (err.message === "FEE_RACE") return res.status(402).json({ error: "Balance changed — insufficient funds for fee" });
    console.error("[CONFIRM SERVICE BOOKING ERROR]", err);
    return res.status(500).json({ error: "Could not confirm" });
  }
};

const completeServiceBooking = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const booking = await prisma.serviceBooking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== "CONFIRMED") return res.status(400).json({ error: `Only CONFIRMED bookings can be completed (now ${booking.status})` });
    if (booking.bookerId !== req.user.id && booking.providerId !== req.user.id) return res.status(403).json({ error: "Not your booking" });

    const isBooker = req.user.id === booking.bookerId;
    const field = isBooker ? "bookerCompletedAt" : "providerCompletedAt";
    const otherField = isBooker ? "providerCompletedAt" : "bookerCompletedAt";
    if (booking[field]) return res.status(400).json({ error: "You already marked as completed" });

    const { recordWalletMovement } = require("../utils/wallet");

    // Single atomic transaction handles both the "first party marks" and "both marked ->
    // release escrow" paths. Previously the flag-set and the payout were two separate,
    // unguarded steps driven by a pre-transaction read of `booking` — two concurrent
    // "mark complete" calls (e.g. a double-tap, or booker+provider clicking at the same
    // instant) could both observe the pre-completion state and both execute the payout
    // transaction, releasing the escrow to the provider twice. Now the flag-set is itself
    // the atomic guard: only the request that actually flips [field] from null wins, and
    // the decision to pay out is made from a fresh in-transaction read.
    const result = await prisma.$transaction(async (tx) => {
      const flagOk = await tx.serviceBooking.updateMany({ where: { id, status: "CONFIRMED", [field]: null }, data: { [field]: new Date() } });
      if (flagOk.count === 0) throw new Error("ALREADY_MARKED");

      const fresh = await tx.serviceBooking.findUnique({ where: { id } });
      if (!fresh[otherField]) {
        // First party to mark — wait for the other, nothing to pay out yet.
        return { released: false };
      }

      // Both have now marked — release escrow to provider, guarded so this can only
      // happen once (status flips CONFIRMED -> COMPLETED atomically with the payout).
      const releaseOk = await tx.serviceBooking.updateMany({ where: { id, status: "CONFIRMED" }, data: { status: "COMPLETED" } });
      if (releaseOk.count === 0) return { released: false }; // already released by the other request
      await tx.user.update({ where: { id: booking.providerId }, data: { gigBalance: { increment: booking.amount } } });
      await recordWalletMovement({ userId: booking.providerId, direction: "CREDIT", amount: booking.amount, fee: 0, type: "SERVICE_PAYOUT", title: "Service completed — payout", body: `Credit: ₦${(booking.amount/100).toLocaleString()} escrow released for booking #${id} — credited to Gig wallet.`, meta: { bookingId: id }, tx });
      try { const { maybeCreditReferral } = require("../utils/referral"); await maybeCreditReferral({ referredId: booking.providerId, transactionType: "SERVICE", transactionId: String(id), amountKobo: booking.amount, tx }); } catch (e) { console.warn("[REFERRAL SERVICE CREDIT FAIL]", e.message); }
      return { released: true };
    });

    if (!result.released) {
      try {
        const otherId = isBooker ? booking.providerId : booking.bookerId;
        await prisma.notification.create({ data: { userId: otherId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_COMPLETED_PENDING" } });
        const { emitNotification } = require("../realtime");
        const { sendPushToUser } = require("../utils/push");
        emitNotification(otherId, { type: "SERVICE_COMPLETED_PENDING", listingId: booking.listingId });
        sendPushToUser(prisma, otherId, { title: "Service marked completed", body: `${isBooker ? "Booker" : "Provider"} marked service #${id} as done — tap to confirm and release escrow`, url: "/bookings", tag: `complete-pending-${id}` }).catch(()=>{});
      } catch {}
      return res.json({ message: `Marked as completed — waiting for ${isBooker ? "provider" : "booker"} to confirm to release escrow.` });
    }

    try {
      await prisma.notification.createMany({ data: [
        { userId: booking.bookerId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_COMPLETED" },
        { userId: booking.providerId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_COMPLETED" },
      ]});
      const { emitNotification } = require("../realtime");
      const { sendPushToUser } = require("../utils/push");
      emitNotification(booking.bookerId, { type: "SERVICE_COMPLETED", listingId: booking.listingId });
      emitNotification(booking.providerId, { type: "SERVICE_COMPLETED", listingId: booking.listingId });
      sendPushToUser(prisma, booking.bookerId, { title: "Service completed", body: `Escrow ₦${(booking.amount/100).toLocaleString()} released to provider`, url: "/bookings", tag: `completed-${id}` }).catch(()=>{});
      sendPushToUser(prisma, booking.providerId, { title: "Service completed", body: `You received escrow ₦${(booking.amount/100).toLocaleString()}`, url: "/bookings", tag: `completed-${id}` }).catch(()=>{});
    } catch {}

    return res.json({ message: `Both confirmed — escrow ₦${(booking.amount/100).toLocaleString()} released to provider.` });
  } catch (err) {
    if (err.message === "ALREADY_MARKED") return res.status(400).json({ error: "You already marked as completed" });
    console.error("[COMPLETE SERVICE BOOKING ERROR]", err);
    return res.status(500).json({ error: "Could not complete service" });
  }
};

const disputeServiceBooking = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { reason, description } = req.body;
    const booking = await prisma.serviceBooking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== "CONFIRMED") return res.status(400).json({ error: `Only CONFIRMED bookings can be disputed (now ${booking.status})` });
    if (booking.bookerId !== req.user.id && booking.providerId !== req.user.id) return res.status(403).json({ error: "Not your booking" });

    const updated = await prisma.serviceBooking.update({ where: { id }, data: { status: "DISPUTED", disputeReason: reason || null, disputeDescription: description || null } });
    try {
      const otherId = req.user.id === booking.bookerId ? booking.providerId : booking.bookerId;
      await prisma.notification.create({ data: { userId: otherId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_DISPUTED" } });
      // admin notify
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      for (const a of admins) {
        await prisma.notification.create({ data: { userId: a.id, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_DISPUTED_ADMIN" } }).catch(()=>{});
        const { sendPushToUser } = require("../utils/push");
        const { emitNotification } = require("../realtime");
        sendPushToUser(prisma, a.id, { title: "New service dispute", body: `Booking #${id} — ${reason || "disputed"}`, url: "/admin/disputes", tag: `dispute-${id}` }).catch(()=>{});
        try { emitNotification(a.id, { type: "SERVICE_DISPUTED_ADMIN" }); } catch {}
      }
      const { emitNotification } = require("../realtime");
      emitNotification(otherId, { type: "SERVICE_DISPUTED", listingId: booking.listingId });
    } catch {}
    return res.json({ booking: updated, message: "Disputed — admin will review, escrow held, completion paused." });
  } catch (err) {
    console.error("[DISPUTE SERVICE BOOKING ERROR]", err);
    return res.status(500).json({ error: "Could not dispute" });
  }
};

const cancelServiceBooking = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const booking = await prisma.serviceBooking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.providerId !== req.user.id && booking.bookerId !== req.user.id) return res.status(403).json({ error: "Not your booking" });
    if (booking.status !== "PENDING") return res.status(400).json({ error: `Cannot cancel ${booking.status}` });

    const { recordWalletMovement } = require("../utils/wallet");
    // Atomic guard on status: without this, cancel racing a concurrent confirm (or a
    // double-tap of cancel itself) can both pass the pre-transaction PENDING check and
    // both refund the booker — double refund. Only the request that actually flips
    // PENDING -> CANCELLED proceeds to refund.
    await prisma.$transaction(async (tx) => {
      const ok = await tx.serviceBooking.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED" } });
      if (ok.count === 0) throw new Error("ALREADY_RESOLVED");
      await tx.user.update({ where: { id: booking.bookerId }, data: { gigBalance: { increment: booking.amount } } });
      await recordWalletMovement({ userId: booking.bookerId, direction: "CREDIT", amount: booking.amount, fee: 0, type: "SERVICE_REFUND", title: "Booking cancelled — refund", body: `Credit: ₦${(booking.amount/100).toLocaleString()} refunded for cancelled booking #${id}.`, meta: { bookingId: id }, tx });
    });
    return res.json({ message: `Cancelled — ₦${(booking.amount/100).toLocaleString()} refunded to your Gig wallet.` });
  } catch (err) {
    if (err.message === "ALREADY_RESOLVED") return res.status(400).json({ error: "Booking was already confirmed, cancelled, or expired" });
    console.error("[CANCEL SERVICE BOOKING ERROR]", err);
    return res.status(500).json({ error: "Could not cancel" });
  }
};

const expireServiceBookings = async () => {
  try {
    const now = new Date();
    const expired = await prisma.serviceBooking.findMany({ where: { status: "PENDING", expiresAt: { lte: now } } });
    for (const b of expired) {
      try {
        const { recordWalletMovement } = require("../utils/wallet");
        // Same atomic guard as cancelServiceBooking: this cron can race a user manually
        // cancelling or the provider confirming at the same moment. Only proceed with the
        // refund if this call is the one that actually flips PENDING -> EXPIRED.
        const released = await prisma.$transaction(async (tx) => {
          const ok = await tx.serviceBooking.updateMany({ where: { id: b.id, status: "PENDING" }, data: { status: "EXPIRED" } });
          if (ok.count === 0) return false;
          await tx.user.update({ where: { id: b.bookerId }, data: { gigBalance: { increment: b.amount } } });
          await recordWalletMovement({ userId: b.bookerId, direction: "CREDIT", amount: b.amount, fee: 0, type: "SERVICE_EXPIRED_REFUND", title: "Booking expired — refund", body: `Credit: ₦${(b.amount/100).toLocaleString()} refunded for expired booking #${b.id} (1h).`, meta: { bookingId: b.id }, tx });
          return true;
        });
        if (released) console.log(`[SERVICE BOOKING] Auto-expired ${b.id} after 1h — refunded to Gig wallet`);
      } catch (e) { console.error(`[SERVICE BOOKING EXPIRE ${b.id} ERROR]`, e.message); }
    }
  } catch (e) { console.error("[SERVICE BOOKING EXPIRE ERROR]", e.message); }
};

const getServiceBookings = async (req, res) => {
  try {
    const asProvider = await prisma.serviceBooking.findMany({ where: { providerId: req.user.id }, orderBy: { createdAt: "desc" }, include: { listing: true, booker: { select: { id: true, username: true } } } });
    const asBooker = await prisma.serviceBooking.findMany({ where: { bookerId: req.user.id }, orderBy: { createdAt: "desc" }, include: { listing: true, provider: { select: { id: true, username: true, whatsapp: true } } } });
    return res.json({ asProvider, asBooker });
  } catch (err) {
    console.error("[GET SERVICE BOOKINGS ERROR]", err);
    return res.status(500).json({ error: "Could not load" });
  }
};

module.exports = { bookService, confirmServiceBooking, completeServiceBooking, disputeServiceBooking, cancelServiceBooking, expireServiceBookings, getServiceBookings };
