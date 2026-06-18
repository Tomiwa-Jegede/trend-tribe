// src/routes/listing.routes.js

const express = require("express");
const {
  getAllListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getListingsByUser,
} = require("../controllers/listing.controller");
const { protect } = require("../middleware/auth.middleware");
const {
  createListingRules,
  updateListingRules,
} = require("../validators/listing.validators");
const validate = require("../middleware/validate");

const router = express.Router();
const { requireVerified } = require("../middleware/verified.middleware");
// ─── Public Routes ────────────────────────────────────────────

// GET /api/listings
router.get("/", getAllListings);

// GET /api/listings/user/:userId
router.get("/user/:userId", getListingsByUser);

// GET /api/listings/:id
router.get("/:id", getListingById);

// ─── Protected Routes ─────────────────────────────────────────

// POST /api/listings  ← must be logged in
router.post("/", protect, createListingRules, validate, createListing);

// PUT /api/listings/:id  ← must be logged in + owner
router.put("/:id", protect, updateListingRules, validate, updateListing);

// DELETE /api/listings/:id  ← must be logged in + owner
router.delete("/:id", protect, deleteListing);

router.post("/", protect, requireVerified, createListing);

// ...


module.exports = router;
