// src/controllers/upload.controller.js
const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image files were provided" });
    }

    const urls = req.files.map((file) => file.path);
    const publicIds = req.files.map((file) => file.filename);

    return res.status(200).json({
      message: "Images uploaded successfully ✅",
      urls,
      publicIds,
    });
  } catch (err) {
    console.error("[UPLOAD IMAGES ERROR]", err);
    return res.status(500).json({ error: "Image upload failed" });
  }
};

module.exports = { uploadImages };
