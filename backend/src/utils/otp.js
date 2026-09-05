// src/utils/otp.js — OTP generation helper
const crypto = require("crypto");

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const getOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

module.exports = { generateOTP, getOTPExpiry };
