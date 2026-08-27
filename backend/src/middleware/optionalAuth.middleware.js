// src/middleware/optionalAuth.middleware.js — Optional JWT Auth
// Same idea as auth.middleware.js's `protect`, but NEVER rejects.
// If a valid token is present, req.user is populated.
// If it's missing, expired, or invalid, req.user stays undefined
// and the request continues as a guest.
const { verifyToken } = require("../utils/jwt");
const prisma = require("../db");

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // no token — proceed as guest
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return next(); // malformed header — proceed as guest
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return next(); // expired/invalid — proceed as guest, don't error
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
      },
    });

    if (user) {
      req.user = user; // logged-in shopper
    }
    // if user is null (deleted account), req.user stays undefined — guest

    next();
  } catch (err) {
    console.error("[OPTIONAL AUTH MIDDLEWARE ERROR]", err);
    next(); // even on unexpected error, don't block the request — guest fallback
  }
};

module.exports = { optionalAuth };