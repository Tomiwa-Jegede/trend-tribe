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

    // For SERVICES, escrow is whole amount from booker's marketplace token wallet (1 token = ₦200 = 20000 kobo)
    // Require booker has enough tokens to cover amount
    const requiredTokens = Math.ceil(amountKobo / 20000);
    const booker = await prisma.user.findUnique({ where: { id: req.user.id }, select: { tokenBalance: true } });
    if ((booker?.tokenBalance || 0) < requiredTokens) {
      return res.status(402).json({ error: `Need ${requiredTokens} tokens to book this service (₦${(amountKobo/100).toLocaleString()}). You have ${booker?.tokenBalance||0}.`, requiredTokens, tokenBalance: booker?.tokenBalance||0 });
    }

    const booking = await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { id: req.user.id, tokenBalance: { gte: requiredTokens } }, data: { tokenBalance: { decrement: requiredTokens } } });
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

    return res.status(201).json({ booking, message: `Booked — provider has 1h to Confirm/Cancel. You are notified of 1h window. 20% provider fee on Confirm.` });
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
    const feeTokens = Math.ceil(feeKobo / 20000);
    const provider = await prisma.user.findUnique({ where: { id: req.user.id }, select: { tokenBalance: true } });
    if ((provider?.tokenBalance || 0) < feeTokens) return res.status(402).json({ error: `Need ${feeTokens} tokens for 20% fee (₦${(feeKobo/100).toLocaleString()}). You have ${provider?.tokenBalance||0}.`, feeTokens });

    const bookerRefundTokens = Math.ceil(booking.amount / 20000);
    await prisma.$transaction(async (tx) => {
      const ok = await tx.user.updateMany({ where: { id: req.user.id, tokenBalance: { gte: feeTokens } }, data: { tokenBalance: { decrement: feeTokens } } });
      if (ok.count === 0) throw new Error("FEE_RACE");
      await tx.user.update({ where: { id: booking.bookerId }, data: { tokenBalance: { increment: bookerRefundTokens } } });
      await tx.serviceBooking.update({ where: { id }, data: { status: "CONFIRMED" } });
    });

    // Notify booker with provider whatsapp
    const providerUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { whatsapp: true } });
    try {
      await prisma.notification.create({ data: { userId: booking.bookerId, actorId: req.user.id, listingId: booking.listingId, type: "SERVICE_CONFIRMED" } });
      const { emitNotification } = require("../realtime");
      emitNotification(booking.bookerId, { type: "SERVICE_CONFIRMED", listingId: booking.listingId });
    } catch {}

    return res.json({ message: `Confirmed — 20% fee ₦${(feeKobo/100).toLocaleString()} (${feeTokens} tokens) charged. Booker gets your WhatsApp.`, whatsapp: providerUser?.whatsapp, feeTokens, feeKobo });
  } catch (err) {
    console.error("[CONFIRM SERVICE BOOKING ERROR]", err);
    return res.status(500).json({ error: "Could not confirm" });
  }
};

const cancelServiceBooking = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const booking = await prisma.serviceBooking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.providerId !== req.user.id && booking.bookerId !== req.user.id) return res.status(403).json({ error: "Not your booking" });
    if (booking.status !== "PENDING") return res.status(400).json({ error: `Cannot cancel ${booking.status}` });

    const refundTokens = Math.ceil(booking.amount / 20000);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: booking.bookerId }, data: { tokenBalance: { increment: refundTokens } } });
      await tx.serviceBooking.update({ where: { id }, data: { status: "CANCELLED" } });
    });
    return res.json({ message: `Cancelled — refunded ₦${(booking.amount/100).toLocaleString()} to booker.` });
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
      const refundTokens = Math.ceil(b.amount / 20000);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: b.bookerId }, data: { tokenBalance: { increment: refundTokens } } });
        await tx.serviceBooking.update({ where: { id: b.id }, data: { status: "EXPIRED" } });
      });
      console.log(`[SERVICE BOOKING] Auto-expired ${b.id} after 1h`);
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

module.exports = { bookService, confirmServiceBooking, cancelServiceBooking, expireServiceBookings, getServiceBookings };
