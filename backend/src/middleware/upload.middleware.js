// src/middleware/upload.middleware.js — Multer + Cloudinary Storage

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ─── Listings storage ──────────────────────────────────────────
// Credit-saver: incoming transform limits stored size to 1024px and auto-optimizes,
// so we store 1 lightweight variant instead of full-res + many derived transforms.
const listingStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "trendtribe/listings",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    // Applied at upload time (not counted as extra derived transformation)
    transformation: [
      { width: 1024, height: 1024, crop: "limit", quality: "auto:good", fetch_format: "auto" },
    ],
  },
});

// ─── Avatar storage ────────────────────────────────────────────
// Reduced to 300px (was 400px) + auto quality to cut storage/bandwidth
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "trendtribe/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 300, height: 300, crop: "fill", gravity: "face", quality: "auto:good", fetch_format: "auto" },
    ],
  },
});

// ─── File filter ───────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage: listingStorage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024, files: 3 }, // reduced from 5 files / 5MB to 3 / 3MB to stay under 25-credit free quota
});
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});
// ─── In-memory storage (Frederick image search — not persisted) ──
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
module.exports = { upload, uploadAvatar, uploadMemory };
