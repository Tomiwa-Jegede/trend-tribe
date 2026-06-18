// vite.config.js

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";

// ─── Get the last git commit date for a specific file ─────────
// Falls back to "Unknown" if git isn't available (e.g. fresh clone
// with no .git folder, or file was never committed yet) so the
// build never breaks because of this.
const getLastCommitDate = (filePath) => {
  try {
    const isoDate = execSync(`git log -1 --format=%cI -- ${filePath}`)
      .toString()
      .trim();

    if (!isoDate) return null; // file has no commits yet

    return new Date(isoDate).toLocaleDateString("en-US", {
      year: "month",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
};

export default defineConfig({
  plugins: [react()],
  define: {
    __TERMS_LAST_UPDATED__: JSON.stringify(
      getLastCommitDate("src/pages/TermsPage.jsx"),
    ),
    __PRIVACY_LAST_UPDATED__: JSON.stringify(
      getLastCommitDate("src/pages/PrivacyPage.jsx"),
    ),
  },

  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5050",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
console.log(
  "TERMS DATE:",
  getLastCommitDate("frontend/src/pages/TermsPage.jsx"),
);
