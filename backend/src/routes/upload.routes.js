// src/routes/upload.routes.js
const express = require("express");
const { upload } = require("../middleware/upload.middleware");
const { protect } = require("../middleware/auth.middleware");
const { uploadImages } = require("../controllers/upload.controller");

const router = express.Router();

router.post("/images", protect, upload.array("images", 5), uploadImages);

router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Each image must be under 5MB" });
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ error: "Maximum 5 images allowed" });
  }
  if (err.message === "Only image files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  console.error("[UPLOAD ROUTE ERROR]", err);
  return res.status(500).json({ error: "Upload failed" });
});

module.exports = router;
