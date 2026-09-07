// src/controllers/gigPayment.controller.js — buyable Gig Naira via Flutterwave, separate from marketplace tokens
const prisma = require("../db");
const config = require("../config/env");

const initGigPayment = async (req, res) => {
  try {
    const { amount } = req.body; // amount in Naira (e.g. 500, 1000)
    const amt = parseInt(amount, 10);
    if (!amt || amt < 100) return res.status(400).json({ error: "Amount must be at least ₦100" });
    const txRef = `gt_${req.user.id}_${Date.now()}`;
    const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.flutterwave.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amt,
        currency: "NGN",
        redirect_url: config.flutterwave.redirectUrl.replace("/tokens/callback", "/gigs/callback"),
        customer: { email: req.user.email },
        customizations: { title: "TrendTribe Gig Wallet", description: `Gig wallet top-up ₦${amt}` },
        meta: { userId: req.user.id, amount: amt, type: "gig" },
      }),
    });
    const data = await flwRes.json();
    if (data.status !== "success") return res.status(502).json({ error: "Could not start Gig payment." });
    await prisma.gigTokenPurchase.create({ data: { userId: req.user.id, reference: txRef, amount: amt * 100, status: "PENDING" } });
    return res.json({ authorizationUrl: data.data.link, reference: txRef });
  } catch (err) {
    console.error("[GIG PAYMENT INIT ERROR]", err.message);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

const verifyGigPayment = async (req, res) => {
  try {
    const { reference, transaction_id } = req.query;
    if (!reference || !transaction_id) return res.status(400).json({ error: "Missing reference or transaction_id" });
    const purchase = await prisma.gigTokenPurchase.findUnique({ where: { reference } });
    if (!purchase || purchase.userId !== req.user.id) return res.status(404).json({ error: "Purchase not found" });
    if (purchase.status === "SUCCESS") return res.json({ ok: true, status: "SUCCESS", amount: purchase.amount });
    const flwRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, { headers: { Authorization: `Bearer ${config.flutterwave.secretKey}` } });
    const data = await flwRes.json();
    if (data.status === "success" && data.data?.status === "successful" && data.data.tx_ref === purchase.reference && data.data.amount === purchase.amount/100 && data.data.currency === "NGN") {
      await creditGigPurchase(purchase, String(transaction_id));
      return res.json({ ok: true, status: "SUCCESS", amount: purchase.amount });
    }
    if (data.data?.status === "failed") {
      await prisma.gigTokenPurchase.updateMany({ where: { reference, status: "PENDING" }, data: { status: "FAILED" } });
      return res.json({ ok: false, status: "FAILED" });
    }
    return res.json({ ok: false, status: "PENDING" });
  } catch (err) {
    console.error("[GIG PAYMENT VERIFY ERROR]", err.message);
    return res.status(500).json({ error: "Could not verify" });
  }
};

async function creditGigPurchase(purchase, flutterwaveTransactionId) {
  const { count } = await prisma.gigTokenPurchase.updateMany({ where: { reference: purchase.reference, status: "PENDING" }, data: { status: "SUCCESS", flutterwaveTransactionId } });
  if (count === 1) await prisma.user.update({ where: { id: purchase.userId }, data: { gigBalance: { increment: purchase.amount } } });
}

const handleGigWebhook = async (req, res) => {
  try {
    const receivedHash = req.headers["verif-hash"];
    if (!receivedHash || receivedHash !== config.flutterwave.secretHash) return res.status(401).json({ error: "Invalid signature" });
    const event = JSON.parse(req.body.toString("utf8"));
    if (event.event === "charge.completed" && event.data?.status === "successful") {
      const { tx_ref, amount, currency, id: transactionId } = event.data;
      const purchase = await prisma.gigTokenPurchase.findUnique({ where: { reference: tx_ref } });
      if (purchase && purchase.status === "PENDING" && purchase.amount === amount * 100 && currency === "NGN") {
        await creditGigPurchase(purchase, String(transactionId));
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[GIG WEBHOOK ERROR]", err.message);
    return res.status(500).json({ error: "Webhook failed" });
  }
};

module.exports = { initGigPayment, verifyGigPayment, creditGigPurchase, handleGigWebhook };
