// src/config/env.js — Central Environment Config + Validator

require("dotenv").config();

const REQUIRED_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "CLIENT_URL",
  "BREVO_API_KEY",
  "EMAIL_FROM",
  "EMAIL_FROM_NAME",
  "CLOUDINARY_CLOUD_NAME", // ← new
  "CLOUDINARY_API_KEY", // ← new
  "CLOUDINARY_API_SECRET", // ← new
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("❌ Missing required environment variables:");
  missing.forEach((key) => console.error(`   → ${key}`));
  console.error("👉 Check your .env file and try again.");
  process.exit(1);
}

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },

  clientUrl: process.env.CLIENT_URL,

  email: {
    brevoApiKey: process.env.BREVO_API_KEY,
    from: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};

module.exports = config;
