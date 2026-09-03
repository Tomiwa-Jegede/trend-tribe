// src/utils/email.js — Centralized email sending via Brevo (SDK v5)

const { BrevoClient } = require("@getbrevo/brevo");
const config = require("../config/env");

// ─── Configure Brevo client (v5 uses a single client object) ──
const brevo = new BrevoClient({
  apiKey: config.email.brevoApiKey,
});

// ─── Shared email wrapper styling ──────────────────────────────
const wrapEmail = (innerHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
              padding: 32px 24px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: 700; color: #1340B8;">
        Trend<span style="color: #F5C518;">Tribe</span>
      </span>
    </div>
    ${innerHtml}
    <p style="margin-top: 32px; font-size: 12px; color: #9CA3AF; text-align: center;">
      Trend Tribe — Student Marketplace
    </p>
  </div>
`;

// ─── Internal: send via Brevo v5 client ────────────────────────
const sendViaBrevo = async ({ to, subject, html }) => {
  return brevo.transactionalEmails.sendTransacEmail({
    subject,
    htmlContent: html,
    sender: { name: config.email.fromName, email: config.email.from },
    to: [{ email: to }],
  });
};

// ─── Send OTP verification email ───────────────────────────────
const sendOTPEmail = async (toEmail, fullName, otpCode) => {
  const html = wrapEmail(`
    <h2 style="color: #111827; font-size: 18px;">Verify your email</h2>
    <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
      Hi ${fullName}, welcome to Trend Tribe! Use the code below to verify
      your email address. This code expires in 10 minutes.
    </p>
    <div style="background: #EEF4FF; border-radius: 12px; padding: 20px;
                text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px;
                   color: #1340B8;">
        ${otpCode}
      </span>
    </div>
    <p style="color: #9CA3AF; font-size: 13px;">
      If you didn't create a Trend Tribe account, you can safely ignore this email.
    </p>
  `);

  return sendViaBrevo({
    to: toEmail,
    subject: "Verify your Trend Tribe email",
    html,
  });
};

// ─── Send password reset email ─────────────────────────────────
const sendPasswordResetEmail = async (toEmail, fullName, resetUrl) => {
  const html = wrapEmail(`
    <h2 style="color: #111827; font-size: 18px;">Reset your password</h2>
    <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
      Hi ${fullName}, we received a request to reset your password.
      Click the button below to choose a new one. This link expires in 30 minutes.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}"
         style="background: #1340B8; color: white; text-decoration: none;
                padding: 12px 28px; border-radius: 10px; font-weight: 600;
                font-size: 14px; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color: #9CA3AF; font-size: 13px;">
      If you didn't request this, you can safely ignore this email —
      your password will remain unchanged.
    </p>
  `);

  return sendViaBrevo({
    to: toEmail,
    subject: "Reset your Trend Tribe password",
    html,
  });
};

// ─── Plain wrapper for marketing emails (deliberately unbranded — ──
// avoids the boxed/logo look that trips Gmail's Promotions filter) ──
const wrapMarketingEmail = (innerHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 16px 8px; color: #1f2937;">
    ${innerHtml}
    <p style="margin-top: 24px; font-size: 12px; color: #9CA3AF;">
      TrendTribe
    </p>
  </div>
`;

// ─── Rotating body message variants for daily marketing email ──
const MARKETING_MESSAGE_VARIANTS = [
  "Just a quick reminder not to forget to check TrendTribe today. 🛍️👀 New listings are waiting, and you might just find something you need! Have a fantastic day ahead!",
  "Someone on campus might be selling exactly what you've been looking for. 🔍 Take a minute to browse today's listings on TrendTribe! Have a great day!",
  "New day, new listings! 🆕 Students around campus have been adding fresh items to TrendTribe — worth a quick look before they're gone. Have a wonderful day!",
  "Psst — TrendTribe's got new stuff today. 👀 Swing by and see what your fellow students are selling this week! Have an amazing day!",
  "Good deals don't wait around. 💸 Check out today's fresh listings on TrendTribe before someone else grabs them! Have a good one!",
  "Hey! 👋 A few new items just popped up on TrendTribe today — might be worth a quick peek. Have a lovely day!",
  "Don't sleep on today's listings! 😄 Fellow students have new stuff up on TrendTribe right now. Have a productive day!",
  "Quick one — TrendTribe's got fresh listings today. 🛒 Worth checking before you get busy with everything else. Have a smooth day!",
  "Your next great find could be on TrendTribe today. ✨ New listings just went up from students around campus. Have a beautiful day!",
  "Heads up! 📢 TrendTribe's been buzzing with new listings today — take a look when you get a sec. Have an awesome day!",
];

const sendMarketingEmail = async (toEmail, fullName, unsubscribeToken) => {
  const bodyMessage = MARKETING_MESSAGE_VARIANTS[Math.floor(Math.random() * MARKETING_MESSAGE_VARIANTS.length)];
const html = wrapMarketingEmail(`
    <p style="font-size: 14px; line-height: 1.6;">
      Good morning, ${fullName}! 👋🏽 How's your day going so far?
    </p>
    <p style="font-size: 14px; line-height: 1.6;">
      ${bodyMessage}
    </p>
    <div style="margin: 20px 0;">
          <a href="https://trendtribee.netlify.app"
         style="display: inline-block; padding: 10px 20px; border: 1px solid #1340B8;
                border-radius: 6px; color: #1340B8; text-decoration: none; font-size: 14px; font-weight: 600;">
        What's New →
      </a>
    </div>
  `);

  return sendViaBrevo({
    to: toEmail,
    subject: "Your daily TrendTribe update",
    html,
  });
};

const sendInboxEmail = async (toEmail, fullName, subject, body) => {
  const preview = body.length > 120 ? body.slice(0, 120) + "…" : body;
  const html = wrapEmail(`
    <h2 style="color: #111827; font-size: 18px;">You have a message on Trend Tribe</h2>
    ${subject ? `<p style="color: #111827; font-weight: 600; font-size: 14px; margin: 12px 0 4px;">${subject}</p>` : ""}
    <p style="color: #4B5563; font-size: 14px; line-height: 1.6; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px;">
      ${preview}
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://trendtribee.netlify.app/inbox"
         style="background: #1340B8; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block;">
        View → Inbox
      </a>
    </div>
    <p style="color: #9CA3AF; font-size: 12px;">Hi ${fullName}, you have a new message waiting in your Trend Tribe inbox.</p>
  `);
  return sendViaBrevo({
    to: toEmail,
    subject: subject ? `Trend Tribe: ${subject}` : "You have a message on Trend Tribe",
    html,
  });
};

module.exports = { sendOTPEmail, sendPasswordResetEmail, sendMarketingEmail, sendInboxEmail };