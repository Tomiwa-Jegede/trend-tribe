// src/routes/listing.routes.js

const express = require("express");
const multer = require("multer");
const {
  getAllListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getListingsByUser,
  reportListing,
  revealContact,
  searchListingsByImage,
  toggleFavorite,
  getMyFavoriteIds,
  getMyFavorites,
} = require("../controllers/listing.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireVerified, requireSeller } = require("../middleware/verified.middleware");
const {
  createListingRules,
  updateListingRules,
} = require("../validators/listing.validators");
const validate = require("../middleware/validate");
const router = express.Router();

// In-memory only — this route never touches Cloudinary or disk,
// the image is used once for Gemini vision then discarded.
const imageSearchUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

// ─── Public ───────────────────────────────────────────────────
router.get("/", getAllListings);
router.get("/user/:userId", getListingsByUser);
router.get("/favorites/mine", protect, getMyFavorites);
router.get("/favorites/ids", protect, getMyFavoriteIds);
router.get("/:id", getListingById);
// ─── Protected ────────────────────────────────────────────────
router.post(
  "/image-search",
  protect,
  imageSearchUpload.single("image"),
  searchListingsByImage,
);
router.post(
  "/",
  protect,
  requireVerified,
  requireSeller,
  createListingRules,
  validate,
  createListing,
);
router.put("/:id", protect, requireSeller, updateListingRules, validate, updateListing);
router.delete("/:id", protect, requireSeller, deleteListing);
router.post("/:id/report", protect, reportListing);
router.post("/:id/contact", protect, revealContact);
router.post("/:id/favorite", protect, toggleFavorite);

module.exports = router;
