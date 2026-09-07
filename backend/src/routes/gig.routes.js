// src/routes/gig.routes.js — Gigs escrow + Gig wallet payments
const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { initGigPayment, verifyGigPayment } = require("../controllers/gigPayment.controller");
const { createGig, listGigs, myGigs, claimGig, confirmGig, cancelGig, renewGig, refundExpired, disputeGig, withdrawGig } = require("../controllers/gig.controller");

const router = express.Router();

// Public feed
router.get("/", listGigs);
// Wallet account + transfer (protected, before :id)
router.get("/account", protect, require("../controllers/gig.controller").getGigAccount);
router.post("/resolve", protect, require("../controllers/gig.controller").resolveGigAccount);
router.post("/transfer", protect, require("../controllers/gig.controller").transferGig);
router.get("/transfers", protect, require("../controllers/gig.controller").listGigTransfers);
// Payments (protected)
router.post("/payments/init", protect, initGigPayment);
router.get("/payments/verify", protect, verifyGigPayment);
// My gigs
router.get("/mine", protect, myGigs);
// Withdraw
router.post("/withdraw", protect, withdrawGig);
// CRUD + escrow
router.post("/", protect, createGig);
router.post("/:id/claim", protect, claimGig);
router.post("/:id/confirm", protect, confirmGig);
router.post("/:id/cancel", protect, cancelGig);
router.post("/:id/renew", protect, renewGig);
router.post("/:id/refund-expired", protect, refundExpired);
router.post("/:id/dispute", protect, disputeGig);

module.exports = router;
