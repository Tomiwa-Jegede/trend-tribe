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
      return tx.serviceBooking.create({
        data: { listingId, bookerId: req.user.id, providerId: listing.sellerId, amount: amountKobo, status: "PENDING", expiresAt },
      });
    });

    // Notify provider
    try {
      await prisma.notification.create({ data: { userId: listing.sellerId, actorId: req.user.id, listingId, type: "SERVICE_BOOKING" } });
      const { emitNotification } = require("../realtime");
      emitNotification(listing.sellerId, { type: "SERVICE_BOOKING", listingId });
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

    const feeKobo = Math.floor(booking.amount * 0.2);
    const provider = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gigBalance: true } });
    if ((provider?.gigBalance || 0) < feeKobo) return res.status(402).json({ error: `Insufficient Gig balance for 20% fee. Need ₦${(feeKobo/100).toLocaleString()} in Gig wallet. You have ₦${((provider?.gigBalance||0)/100).toLocaleString()}. Please fund your Gig wallet.`, feeKobo });

    await prisma.$transaction(async (tx) => {
      const ok = await tx.user.updateMany({ where: { id: req.user.id, gigBalance: { gte: feeKobo } }, data: { gigBalance: { decrement: feeKobo } } });
      if (ok.count === 0) throw new Error("FEE_RACE");
      // Keep escrow held — do NOT refund booker yet. Booker paid at booking time, funds stay in escrow until service completed.
      await tx.serviceBooking.update({ where: { id }, data: { status: "CONFIRMED" } });
      await tx.platformProfit.create({ data: { source: "SERVICE_CONFIRM_20", grossFee: feeKobo, netFee: feeKobo, refId: String(id), meta: { bookingId: id, listingId: booking.listingId } } });
    });

    // Notify booker with provider whatsapp — escrow still held
    const providerUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { whatsapp: true } });
    try {
      await prisma.notification.create({ data: { userId: booking.bookerId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_CONFIRMED" } });
      const { emitNotification } = require("../realtime");
      emitNotification(booking.bookerId, { type: "SERVICE_CONFIRMED", listingId: booking.listingId });
    } catch {}

    return res.json({ message: `Confirmed — escrow still held (₦${(booking.amount/100).toLocaleString()}), booker gets your WhatsApp. Mark as completed after service to release funds.`, whatsapp: providerUser?.whatsapp, feeKobo });
  } catch (err) {
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

    await prisma.$transaction(async (tx) => {
      // Release escrow to provider
      await tx.user.update({ where: { id: booking.providerId }, data: { gigBalance: { increment: booking.amount } } });
      await tx.serviceBooking.update({ where: { id }, data: { status: "COMPLETED" } });
    });

    try {
      const otherId = req.user.id === booking.bookerId ? booking.providerId : booking.bookerId;
      await prisma.notification.create({ data: { userId: otherId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_COMPLETED" } });
      await prisma.notification.create({ data: { userId: req.user.id, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_COMPLETED" } });
      const { emitNotification } = require("../realtime");
      emitNotification(booking.bookerId, { type: "SERVICE_COMPLETED", listingId: booking.listingId });
      emitNotification(booking.providerId, { type: "SERVICE_COMPLETED", listingId: booking.listingId });
    } catch {}

    return res.json({ message: `Service completed — escrow ₦${(booking.amount/100).toLocaleString()} released to provider.` });
  } catch (err) {
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

    const updated = await prisma.serviceBooking.update({ where: { id }, data: { status: "DISPUTED" } });
    try {
      const otherId = req.user.id === booking.bookerId ? booking.providerId : booking.bookerId;
      await prisma.notification.createMany({ data: [
        { userId: otherId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_DISPUTED" },
        { userId: booking.bookerId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_DISPUTED" },
        { userId: booking.providerId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_DISPUTED" },
      ]});
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
      emitNotification(booking.bookerId, { type: "SERVICE_DISPUTED", listingId: booking.listingId });
      emitNotification(booking.providerId, { type: "SERVICE_DISPUTED", listingId: booking.listingId });
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

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: booking.bookerId }, data: { gigBalance: { increment: booking.amount } } });
      await tx.serviceBooking.update({ where: { id }, data: { status: "CANCELLED" } });
    });
    return res.json({ message: `Cancelled — ₦${(booking.amount/100).toLocaleString()} refunded to your Gig wallet.` });
  } catch (err) {
    console.error("[CANCEL SERVICE BOOKING ERROR]", err);
    return res.status(500).json({ error: "Could not cancel" });
  }
};

const expireServiceBookings = async () => {
  try {
    const now = new Date();
    const expired = await prisma.serviceBooking.findMany({ where: { status: "PENDING", expiresAt: { lte: now } } });
    for (const b of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: b.bookerId }, data: { gigBalance: { increment: b.amount } } });
        await tx.serviceBooking.update({ where: { id: b.id }, data: { status: "EXPIRED" } });
      });
      console.log(`[SERVICE BOOKING] Auto-expired ${b.id} after 1h — refunded to Gig wallet`);
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
