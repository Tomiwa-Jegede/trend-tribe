// src/config/env.js — Central Environment Config + Validator

require("dotenv").config();

const REQUIRED_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "CLIENT_URL",
  "API_URL",
  "BREVO_API_KEY",
  "EMAIL_FROM",
  "EMAIL_FROM_NAME",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CRON_SECRET",
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("❌ Missing required environment variables:");
  missing.forEach((key) => console.error(`   → ${key}`));
  console.error("👉 Check your .env file and try again.");
  process.exit(1);
}

const rawClientUrl = process.env.CLIENT_URL || "https://trendtribe.app";
const clientUrlList = rawClientUrl.split(",").map((s) => s.trim()).filter(Boolean);
// Canonical URL for emails/sitemaps: prefer https://trendtribe.app in production, localhost in dev
const primaryClientUrl =
  process.env.NODE_ENV === "production"
    ? clientUrlList.find((u) => u.includes("trendtribe.app") && u.startsWith("https://")) || clientUrlList.find((u) => u.startsWith("https://")) || clientUrlList[0]
    : clientUrlList[0] || "http://localhost:5173";

const config = {
  port: parseInt(process.env.PORT, 10) || 5050,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },

  clientUrl: primaryClientUrl,
  clientUrlList,
  apiUrl: process.env.API_URL,
  cronSecret: process.env.CRON_SECRET,

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || "mailto:hello@trendtribe.ng",
  },

  pusher: {
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER || "eu",
  },

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

  flutterwave: {
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
    secretHash: process.env.FLUTTERWAVE_SECRET_HASH,
    redirectUrl: process.env.FLUTTERWAVE_REDIRECT_URL,
  },
};

module.exports = config;
