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

module.exports = { sendOTPEmail, sendPasswordResetEmail };
