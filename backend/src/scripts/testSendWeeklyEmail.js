// src/scripts/testSendWeeklyEmail.js
// Safe test runner for the weekly marketing email.
// Default: DRY RUN — logs the real recipient list, sends nothing.
// With --live: sends ONE real email, always to the hardcoded test
// address below, never to the real recipient list. Use this to check
// how the actual email looks/lands (Primary vs Promotions) before
// ever running the real sendWeeklyEmail script for real.

const prisma = require("../db");
const { sendMarketingEmail } = require("../utils/email");

const TEST_EMAIL = "jegedetomiwa1@gmail.com";
const isLive = process.argv.includes("--live");

const run = async () => {
  const recipients = await prisma.user.findMany({
    where: { isVerified: true, marketingOptIn: true },
    select: { id: true, email: true, fullName: true, unsubscribeToken: true },
  });

  console.log(`[TEST] Real recipient list would include ${recipients.length} users:`);
  recipients.forEach((u) => console.log(`  - ${u.email} (id ${u.id})`));

  if (!isLive) {
    console.log("\n[TEST] Dry run only — no email sent. Re-run with --live to send ONE real test email.");
    process.exit(0);
  }

  console.log(`\n[TEST] --live flag set. Sending ONE real email to ${TEST_EMAIL} only (not the list above).`);

  try {
    await sendMarketingEmail(TEST_EMAIL, "Tomiwa", "test-token-not-a-real-user");
    console.log(`[TEST] ✅ Sent to ${TEST_EMAIL}. Check your inbox (and Promotions tab).`);
  } catch (err) {
    console.error(`[TEST] ❌ Failed to send:`, err.message);
  }

  process.exit(0);
};

run();
