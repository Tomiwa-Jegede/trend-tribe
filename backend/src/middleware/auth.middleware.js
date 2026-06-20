// src/middleware/auth.middleware.js — JWT Auth Guard

const { verifyToken } = require("../utils/jwt");
const prisma = require("../db");

const protect = async (req, res, next) => {
  try {
    // 1. Read the Authorization header
    const authHeader = req.headers.authorization;

    // 2. Check header exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access denied. No token provided.",
      });
    }

    // 3. Extract the token (strip "Bearer " prefix)
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Access denied. Token missing.",
      });
    }

    // 4. Verify + decode the token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      // Handle specific JWT errors with clear messages
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "Session expired. Please log in again.",
        });
      }
      if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
          error: "Invalid token. Please log in again.",
        });
      }
      throw err; // unknown error — let global handler catch it
    }

    // 5. Confirm user still exists in the database
    //    (catches cases where account was deleted after token was issued)
const user = await prisma.user.findUnique({
  where: { id: decoded.id },
  select: {
    id: true,
    email: true,
    username: true,
    fullName: true,
    school: true,
    bio: true,
    avatar: true,
    isVerified: true, // ← added
    role: true,
    createdAt: true,
    updatedAt: true,
  },
});

    if (!user) {
      return res.status(401).json({
        error: "User no longer exists.",
      });
    }

    // 6. Attach user to request object for downstream use
    req.user = user;

    // 7. Continue to the next middleware / controller
    next();
  } catch (err) {
    console.error("[AUTH MIDDLEWARE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { protect };
