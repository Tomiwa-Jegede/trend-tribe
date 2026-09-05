// src/controllers/push.controller.js
const prisma = require("../db");
const { getPublicKey, sendPushToSubscription } = require("../utils/push");

const getVapidPublicKey = async (req, res) => {
  const key = getPublicKey();
  if (!key) return res.status(500).json({ error: "Push not configured" });
  return res.json({ publicKey: key });
};

const subscribe = async (req, res) => {
  try {
    const { endpoint, keys, expirationTime } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Invalid subscription: missing endpoint/keys" });
    }
    const p256dh = keys.p256dh;
    const auth = keys.auth;
    const userId = req.user?.id || null;

    // Upsert by endpoint — each browser/device has unique endpoint
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, expirationTime: expirationTime ? new Date(expirationTime) : null, userId },
      create: { endpoint, p256dh, auth, expirationTime: expirationTime ? new Date(expirationTime) : null, userId },
    });
    return res.status(201).json({ message: "Subscribed", subscription: { id: sub.id } });
  } catch (err) {
    console.error("[PUSH SUBSCRIBE ERROR]", err);
    return res.status(500).json({ error: "Failed to save subscription" });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: "endpoint required" });
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return res.json({ message: "Unsubscribed" });
  } catch (err) {
    console.error("[PUSH UNSUB ERROR]", err);
    return res.status(500).json({ error: "Failed to unsubscribe" });
  }
};

const testPush = async (req, res) => {
  try {
    const userId = req.user.id;
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return res.status(404).json({ error: "No push subscription found. Enable notifications first." });
    let sent = 0;
    for (const sub of subs) {
      const r = await sendPushToSubscription(sub, {
        title: "Trend Tribe — Test",
        body: "Push works! You'll get updates even when the app is closed.",
        url: "/",
        badgeCount: 1,
        icon: "/icon-192.png",
      });
      if (r.shouldDelete) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      else if (r.success) sent++;
    }
    return res.json({ message: `Test sent to ${sent}/${subs.length} device(s)` });
  } catch (err) {
    console.error("[PUSH TEST ERROR]", err);
    return res.status(500).json({ error: "Failed to send test push" });
  }
};

module.exports = { getVapidPublicKey, subscribe, unsubscribe, testPush };
