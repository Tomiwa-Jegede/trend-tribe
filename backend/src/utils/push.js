// src/utils/push.js — Web Push helper (VAPID)
const webpush = require("web-push");
const config = require("../config/env");

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const { publicKey, privateKey, subject } = config.vapid || {};
  if (!publicKey || !privateKey) {
    console.warn("[PUSH] VAPID keys not configured — push disabled");
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return true;
  } catch (e) {
    console.error("[PUSH CONFIG ERROR]", e.message);
    return false;
  }
}

async function sendPushToSubscription(subscription, payload) {
  if (!ensureConfigured()) return { success: false, reason: "vapid_missing" };
  const pushSub = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };
  // expirationTime optional
  if (subscription.expirationTime) pushSub.expirationTime = subscription.expirationTime;
  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload));
    return { success: true };
  } catch (err) {
    // 410 Gone = subscription expired/invalid
    const status = err.statusCode;
    return { success: false, statusCode: status, error: err.message, shouldDelete: status === 410 || status === 404 };
  }
}

async function sendPushToUser(prisma, userId, payload) {
  if (!ensureConfigured()) {
    console.warn(`[PUSH] VAPID not configured — skip user=${userId}`);
    return 0;
  }
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) {
    console.log(`[PUSH] No subscriptions for user=${userId} tag=${payload.tag || ""}`);
    return 0;
  }
  let sent = 0;
  for (const sub of subs) {
    const r = await sendPushToSubscription(sub, payload);
    if (r.shouldDelete) {
      console.log(`[PUSH] Deleting expired sub id=${sub.id} user=${userId} status=${r.statusCode}`);
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else if (r.success) {
      sent++;
    } else {
      console.warn(`[PUSH] Failed sub id=${sub.id} user=${userId} status=${r.statusCode} err=${r.error}`);
    }
  }
  console.log(`[PUSH] User=${userId} sent=${sent}/${subs.length} tag=${payload.tag || ""}`);
  return sent;
}

module.exports = { ensureConfigured, sendPushToSubscription, sendPushToUser, getPublicKey: () => config.vapid?.publicKey };
