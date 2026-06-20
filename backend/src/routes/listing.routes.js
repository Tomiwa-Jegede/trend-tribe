// src/routes/listing.routes.js

const express = require("express");
const {
  getAllListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getListingsByUser,
  reportListing,
} = require("../controllers/listing.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireVerified } = require("../middleware/verified.middleware");
const {
  createListingRules,
  updateListingRules,
} = require("../validators/listing.validators");
const validate = require("../middleware/validate");

const router = express.Router();

// ─── Public ───────────────────────────────────────────────────
router.get("/", getAllListings);
router.get("/user/:userId", getListingsByUser);
router.get("/:id", getListingById);

// ─── Protected ────────────────────────────────────────────────
router.post(
  "/",
  protect,
  requireVerified,
  createListingRules,
  validate,
  createListing,
);
router.put("/:id", protect, updateListingRules, validate, updateListing);
router.delete("/:id", protect, deleteListing);
router.post("/:id/report", protect, reportListing);

module.exports = router;
