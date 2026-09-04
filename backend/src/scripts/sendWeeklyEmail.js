// src/scripts/sendWeeklyEmail.js
// Sends the weekly marketing/reminder email to all opted-in, verified users.
// Runs one send at a time with a delay between each, to stay under Brevo's
// rate limits and avoid looking like a bulk blast to spam filters.

const prisma = require("../db");
const { sendMarketingEmail } = require("../utils/email");

const DELAY_MS = 2000; // 2 seconds between sends

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendWeeklyEmail = async ({ customMessage = null, customSubject = null } = {}) => {
  const recipients = await prisma.user.findMany({
    where: { isVerified: true, marketingOptIn: true },
    select: { id: true, email: true, fullName: true, unsubscribeToken: true },
  });

  console.log(`[WEEKLY EMAIL] Found ${recipients.length} recipients. Custom: ${!!customMessage}`);
  let sent = 0;
  let failed = 0;
  const failures = [];
  for (const user of recipients) {
    try {
      await sendMarketingEmail(user.email, user.fullName, user.unsubscribeToken, customMessage, customSubject);
      sent += 1;
      console.log(`[WEEKLY EMAIL] ✅ Sent to ${user.email} (id ${user.id})`);
    } catch (err) {
      failed += 1;
      failures.push({ email: user.email, fullName: user.fullName, error: err.message });
      console.error(`[WEEKLY EMAIL] ❌ Failed for ${user.email} (id ${user.id}):`, err.message);
    }
    await sleep(DELAY_MS);
  }
  console.log(`[WEEKLY EMAIL] Done. Sent: ${sent}, Failed: ${failed}, Total: ${recipients.length}`);
  return { sent, failed, total: recipients.length, failures };
};

module.exports = { sendWeeklyEmail };
