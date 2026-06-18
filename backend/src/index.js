// src/index.js — Trend Tribe Backend Entry Point

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const config = require("./config/env"); // ← replaces raw process.env
const prisma = require("./db");

// ─── Route Imports ────────────────────────────────────────────
const authRoutes = require("./routes/auth.routes");
const listingRoutes = require("./routes/listing.routes");

const app = express();

// ─── Middleware ────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: config.clientUrl, // only allow our frontend
    credentials: true, // allow cookies/auth headers
  }),
);

app.use(morgan(config.isDev ? "dev" : "combined")); // verbose in dev, compact in prod
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "OK",
      message: "Trend Tribe API is running 🚀",
      database: "Connected ✅",
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed ❌",
      error: err.message,
    });
  }
});

// ─── Mount Routes ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal server error",
    ...(config.isDev && { detail: err.message }), // show detail in dev only
  });
});

// ─── Start Server ─────────────────────────────────────────────
async function startServer() {
  try {
    await prisma.$connect();
    console.log("🗄️  Database connected successfully");
    app.listen(config.port, () => {
      console.log(`✅ Server running on http://localhost:${config.port}`);
      console.log(`🌍 Environment : ${config.nodeEnv}`);
      console.log(`🔗 Client URL  : ${config.clientUrl}`);
      console.log(`📋 Routes mounted:`);
      console.log(`   → /api/health`);
      console.log(`   → /api/auth`);
      console.log(`   → /api/listings`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
