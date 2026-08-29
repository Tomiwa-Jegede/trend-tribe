// src/controllers/payment.controller.js
const prisma = require("../db");
const config = require("../config/env");
const { TOKEN_UNIT } = require("../utils/tokenFormat");

const TOKEN_PRICE_NAIRA = 200; // ₦200 per token, flat rate

// ─────────────────────────────────────────────────────────────
// POST /api/payments/init ← PROTECTED
// Body: { quantity }
// Creates a PENDING TokenPurchase (our own tx_ref), initializes
// a Flutterwave transaction, returns the hosted checkout link.
// ─────────────────────────────────────────────────────────────
const initPayment = async (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);

    if (!qty || qty < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const amount = qty * TOKEN_PRICE_NAIRA; // Flutterwave uses whole Naira, not kobo
    const txRef = `tt_${req.user.id}_${Date.now()}`;

    const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.flutterwave.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: "NGN",
        redirect_url: config.flutterwave.redirectUrl,
        customer: { email: req.user.email },
        customizations: {
          title: "TrendTribe Tokens",
          description: `Purchase of ${qty} token(s)`,
        },
        meta: { userId: req.user.id, quantity: qty },
      }),
    });

    const data = await flwRes.json();

    if (data.status !== "success") {
      return res.status(502).json({ error: "Could not start payment. Please try again." });
    }

    await prisma.tokenPurchase.create({
      data: {
        userId: req.user.id,
        reference: txRef,
        quantity: qty,
        amount,
        status: "PENDING",
      },
    });

    res.status(200).json({
      authorizationUrl: data.data.link,
      reference: txRef,
    });
  } catch (err) {
    console.error("Payment init error:", err.message);
    res.status(500).json({ error: "Something went wrong starting your payment." });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/payments/verify?reference=...&transaction_id=... ← PROTECTED
// Called by the frontend callback page after Flutterwave redirects
// the user back. Flutterwave verifies by its own numeric
// transaction_id, not our tx_ref — both are passed as query params
// on redirect. Idempotent — safe even if the webhook already
// credited this purchase.
// ─────────────────────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const { reference, transaction_id } = req.query;
    if (!reference || !transaction_id) {
      return res.status(400).json({ error: "Missing reference or transaction_id" });
    }

    const purchase = await prisma.tokenPurchase.findUnique({ where: { reference } });

    if (!purchase || purchase.userId !== req.user.id) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    if (purchase.status === "SUCCESS") {
      return res.status(200).json({ ok: true, status: "SUCCESS", quantity: purchase.quantity });
    }

    const flwRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${config.flutterwave.secretKey}` } },
    );
    const data = await flwRes.json();

    if (
      data.status === "success" &&
      data.data?.status === "successful" &&
      data.data.tx_ref === purchase.reference &&
      data.data.amount === purchase.amount &&
      data.data.currency === "NGN"
    ) {
      await creditPurchase(purchase, transaction_id);
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
// POST /api/payments/webhook ← PUBLIC (Flutterwave server-to-server)
// Mounted in index.js BEFORE express.json() with express.raw(),
// so req.body here is a raw Buffer, not parsed JSON.
// Flutterwave authenticates webhooks via a static secret hash
// header (set in your Flutterwave dashboard), not an HMAC
// signature like Paystack.
// ─────────────────────────────────────────────────────────────
const handleWebhook = async (req, res) => {
  try {
    const receivedHash = req.headers["verif-hash"];

    if (!receivedHash || receivedHash !== config.flutterwave.secretHash) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(req.body.toString("utf8"));

    if (event.event === "charge.completed" && event.data?.status === "successful") {
      const { tx_ref, amount, currency, id: transactionId } = event.data;
      const purchase = await prisma.tokenPurchase.findUnique({ where: { reference: tx_ref } });

      if (
        purchase &&
        purchase.status === "PENDING" &&
        purchase.amount === amount &&
        currency === "NGN"
      ) {
        await creditPurchase(purchase, String(transactionId));
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
async function creditPurchase(purchase, flutterwaveTransactionId) {
  const { count } = await prisma.tokenPurchase.updateMany({
    where: { reference: purchase.reference, status: "PENDING" },
    data: { status: "SUCCESS", flutterwaveTransactionId },
  });

  if (count === 1) {
    await prisma.user.update({
      where: { id: purchase.userId },
      data: { tokenBalance: { increment: purchase.quantity * TOKEN_UNIT } },
    });
  }
}

module.exports = { initPayment, verifyPayment, handleWebhook };