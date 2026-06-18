// src/validators/listing.validators.js

const { body } = require("express-validator");

// ─── Valid Enums (must match schema.prisma exactly) ───────────
const VALID_CATEGORIES = [
  "BOOKS",
  "ELECTRONICS",
  "CLOTHING",
  "FURNITURE",
  "STATIONERY",
  "SPORTS",
  "FOOD",
  "SERVICES",
  "OTHER",
];

const VALID_CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"];

// ─── Create Listing Rules ─────────────────────────────────────
const createListingRules = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(", ")}`),

  body("condition")
    .notEmpty()
    .withMessage("Condition is required")
    .isIn(VALID_CONDITIONS)
    .withMessage(`Condition must be one of: ${VALID_CONDITIONS.join(", ")}`),

  body("images")
    .optional()
    .isArray({ max: 5 })
    .withMessage("Images must be an array of up to 5 URLs"),

  body("images.*")
    .optional()
    .trim()
    .isURL()
    .withMessage("Each image must be a valid URL"),

  body("location")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location must be under 100 characters"),
];

// ─── Update Listing Rules ─────────────────────────────────────
const updateListingRules = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("category")
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(", ")}`),

  body("condition")
    .optional()
    .isIn(VALID_CONDITIONS)
    .withMessage(`Condition must be one of: ${VALID_CONDITIONS.join(", ")}`),

  body("images")
    .optional()
    .isArray({ max: 5 })
    .withMessage("Images must be an array of up to 5 URLs"),

  body("images.*")
    .optional()
    .trim()
    .isURL()
    .withMessage("Each image must be a valid URL"),

  body("location")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location must be under 100 characters"),

  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be true or false"),
];

module.exports = { createListingRules, updateListingRules };
