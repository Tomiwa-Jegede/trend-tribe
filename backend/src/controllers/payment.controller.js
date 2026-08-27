// src/controllers/payment.controller.js
const crypto = require("crypto");
const prisma = require("../db");
const config = require("../config/env");
const { TOKEN_UNIT } = require("../utils/tokenFormat");

const TOKEN_PRICE_NAIRA = 200; // ₦200 per token, flat rate

// ─────────────────────────────────────────────────────────────
// POST /api/payments/init ← PROTECTED
// Body: { quantity }
// Creates a PENDING TokenPurchase, initializes a Paystack
// transaction, returns the hosted checkout URL to redirect to.
// ─────────────────────────────────────────────────────────────
const initPayment = async (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);

    if (!qty || qty < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const amount = qty * TOKEN_PRICE_NAIRA * 100; // kobo

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.paystack.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: req.user.email,
        amount,
        callback_url: config.paystack.callbackUrl,
        metadata: { userId: req.user.id, quantity: qty },
      }),
    });

    const data = await paystackRes.json();

    if (!data.status) {
      return res.status(502).json({ error: "Could not start payment. Please try again." });
    }

    await prisma.tokenPurchase.create({
      data: {
        userId: req.user.id,
        reference: data.data.reference,
        quantity: qty,
        amount,
        status: "PENDING",
      },
    });

    res.status(200).json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (err) {
    console.error("Payment init error:", err.message);
    res.status(500).json({ error: "Something went wrong starting your payment." });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payments/verify?reference=... ← PROTECTED
// Called by the frontend callback page after Paystack redirects
// the user back. Idempotent — safe even if the webhook already
// credited this purchase.
// ─────────────────────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({ error: "Missing reference" });
    }

    const purchase = await prisma.tokenPurchase.findUnique({ where: { reference } });

    if (!purchase || purchase.userId !== req.user.id) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    if (purchase.status === "SUCCESS") {
      return res.status(200).json({ ok: true, status: "SUCCESS", quantity: purchase.quantity });
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${config.paystack.secretKey}` } },
    );
    const data = await paystackRes.json();

    if (data.data?.status === "success" && data.data.amount === purchase.amount) {
      await creditPurchase(purchase);
      return res.status(200).json({ ok: true, status: "SUCCESS", quantity: purchase.quantity });
    }

    if (data.data?.status === "failed") {
      await prisma.tokenPurchase.updateMany({
        where: { reference, status: "PENDING" },
        data: { status: "FAILED" },
      });
      return res.status(200).json({ ok: false, status: "FAILED" });
    }

    res.status(200).json({ ok: false, status: "PENDING" });
  } catch (err) {
    console.error("Payment verify error:", err.message);
    res.status(500).json({ error: "Could not verify payment." });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/payments/webhook ← PUBLIC (Paystack server-to-server)
// Mounted in index.js BEFORE express.json() with express.raw(),
// so req.body here is a raw Buffer, not parsed JSON.
// ─────────────────────────────────────────────────────────────
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    const expected = crypto
      .createHmac("sha512", config.paystack.secretKey)
      .update(req.body)
      .digest("hex");

    if (signature !== expected) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(req.body.toString("utf8"));

    if (event.event === "charge.success") {
      const { reference, amount } = event.data;
      const purchase = await prisma.tokenPurchase.findUnique({ where: { reference } });

      if (purchase && purchase.status === "PENDING" && purchase.amount === amount) {
        await creditPurchase(purchase);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

// ─────────────────────────────────────────────────────────────
// Shared idempotent credit logic. The updateMany guard (status
// must currently be PENDING) prevents a double-credit race
// between /verify and the webhook firing close together.
// ─────────────────────────────────────────────────────────────
async function creditPurchase(purchase) {
  const { count } = await prisma.tokenPurchase.updateMany({
    where: { reference: purchase.reference, status: "PENDING" },
    data: { status: "SUCCESS" },
  });

  if (count === 1) {
    await prisma.user.update({
      where: { id: purchase.userId },
      data: { tokenBalance: { increment: purchase.quantity * TOKEN_UNIT } },
    });
  }
}

module.exports = { initPayment, verifyPayment, handleWebhook };