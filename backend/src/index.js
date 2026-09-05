process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
  process.exit(1);
});

// src/index.js — Trend Tribe Backend Entry Point

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const config = require("./config/env"); // ← replaces raw process.env
const prisma = require("./db");

// ─── Route Imports ────────────────────────────────────────────
const authRoutes = require("./routes/auth.routes");
const listingRoutes = require("./routes/listing.routes");
const uploadRoutes = require("./routes/upload.routes");
const adminRoutes = require("./routes/admin.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const frederickRoutes = require("./routes/frederick.routes");
const paymentRoutes = require("./routes/payment.routes");
const notificationRoutes = require("./routes/notification.routes");
const messageRoutes = require("./routes/message.routes");
const pushRoutes = require("./routes/push.routes");
const pwaRoutes = require("./routes/pwa.routes");
const sitemapRoutes = require("./routes/sitemap.routes");
const { handleWebhook } = require("./controllers/payment.controller");

const http = require("http");
const { initRealtime } = require("./realtime");

const app = express();

// ─── Middleware ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // allow Cloudinary + inline styles; _headers provides CSP where needed
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());

const allowedOrigins = config.clientUrl.split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  }),
);

app.use(morgan(config.isDev ? "dev" : "combined")); // verbose in dev, compact in prod

// ─── Flutterwave Webhook (raw body required for hash verification) ──
// Must be mounted BEFORE express.json() so the raw buffer is preserved.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleWebhook);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

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
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/analytics", analyticsRoutes);
app.use("/api/frederick", frederickRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/pwa", pwaRoutes);
app.use("/sitemap.xml", sitemapRoutes);
app.use("/api/sitemap.xml", sitemapRoutes);

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS origin not allowed" });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large" });
  }
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Max 3MB per image" });
  }
  if (err && err.code === "LIMIT_FILE_COUNT") {
    return res.status(413).json({ error: "Too many files" });
  }
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.expose ? err.message : "Internal server error",
    ...(config.isDev && { detail: err.message }),
  });
});

// ─── Start Server ─────────────────────────────────────────────
async function startServer() {
  try {
    await prisma.$connect();
    console.log("🗄️  Database connected successfully");
    const server = http.createServer(app);
    initRealtime(server, allowedOrigins);
    server.listen(config.port, () => {
      console.log(`✅ Server running on http://localhost:${config.port}`);
      console.log(`🌍 Environment : ${config.nodeEnv}`);
      console.log(`🔗 Client URL  : ${config.clientUrl}`);
      console.log(`📋 Routes mounted:`);
      console.log(`   → /api/health`);
      console.log(`   → /api/auth`);
      console.log(`   → /api/listings`);
      console.log(`   → /socket.io/* (realtime)`);
    });

    // ─── Cleanup: delete expired pending registrations every 10 min ──
    setInterval(async () => {
      try {
        const { count } = await prisma.pendingRegistration.deleteMany({
          where: { otpExpiresAt: { lt: new Date() } },
        });
        if (count > 0) {
          console.log(`🧹 Cleaned up ${count} expired pending registration(s)`);
        }
      } catch (err) {
        console.error("❌ Pending registration cleanup error:", err.message);
      }
    }, 10 * 60 * 1000); // every 10 minutes

    // ─── Ghost prune: 30d auto-hide stale listings (Wayfinder buyer-trust slice) ──
    const { archiveGhostListings } = require("./controllers/listing.controller");
    setInterval(async () => {
      await archiveGhostListings();
    }, 24 * 60 * 60 * 1000); // every 24 hours
    // run once on boot (non-blocking)
    archiveGhostListings().catch(() => {});
    // ─── Clear expired boosts (featured 24h) ──
    setInterval(async () => {
      try {
        await prisma.listing.updateMany({ where: { boostedUntil: { lt: new Date() } }, data: { boostedUntil: null, boostedAt: null } });
      } catch {}
    }, 60 * 60 * 1000); // hourly
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
