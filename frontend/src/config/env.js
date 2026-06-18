// src/config/env.js — Centralized frontend environment config
//
// RULE: No other file in this codebase should ever read `import.meta.env`
// directly. Every config value flows through this one file. This means:
//   - if Vite's env var naming convention ever changes, only this file changes
//   - if you forget to set a var, you get ONE clear console error here,
//     not a silent bug three files deep in production

const requiredVars = {
  VITE_API_URL: import.meta.env.VITE_API_URL,
};

// ─── Validate at startup ───────────────────────────────────────
const missing = Object.entries(requiredVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  // In dev this is loud on purpose — better to catch it now than after deploy
  console.error(
    `❌ Missing required frontend environment variables: ${missing.join(", ")}\n` +
      `👉 Copy frontend/.env.example to frontend/.env and fill in values.`,
  );
}

// ─── Exported config object ────────────────────────────────────
const config = {
  apiUrl: import.meta.env.VITE_API_URL || "/api", // safe fallback for dev
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

export default config;
