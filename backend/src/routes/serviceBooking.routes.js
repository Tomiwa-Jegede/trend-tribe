// src/routes/serviceBooking.routes.js — SERVICES booking: 1h, 20% provider fee on Confirm, escrow from booker
const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { bookService, confirmServiceBooking, cancelServiceBooking, getServiceBookings } = require("../controllers/serviceBooking.controller");

const router = express.Router();

router.get("/bookings", protect, getServiceBookings);
router.post("/listings/:id/book", protect, bookService);
router.post("/bookings/:id/confirm", protect, confirmServiceBooking);
router.post("/bookings/:id/cancel", protect, cancelServiceBooking);

module.exports = router;
