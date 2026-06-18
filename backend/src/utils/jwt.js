// src/utils/jwt.js — JWT Sign + Verify Helpers

const jwt = require("jsonwebtoken");
const config = require("../config/env");

// ─── Sign a token ─────────────────────────────────────────────
// Call this after login/register to generate a token
const signToken = (payload) => {
  return jwt.sign(
    payload, // data to encode  e.g. { id, email }
    config.jwt.secret, // secret key from .env
    { expiresIn: config.jwt.expiresIn }, // e.g. "7d"
  );
};

// ─── Verify a token ───────────────────────────────────────────
// Call this in auth middleware to decode + validate incoming tokens
const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

module.exports = { signToken, verifyToken };
