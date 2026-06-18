// src/middleware/upload.middleware.js — Multer + Cloudinary Storage

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ─── Listings storage ──────────────────────────────────────────
const listingStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "trendtribe/listings",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

// ─── Avatar storage ────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "trendtribe/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
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
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

module.exports = { upload, uploadAvatar };
