// vite.config.js

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
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

    if (!isoDate) return null;

    return new Date(isoDate).toLocaleDateString("en-US", {
      year: "numeric", // ← fixed from "month"
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifestFilename: "manifest.json",
      includeAssets: ["favicon.ico", "favicon-32.png", "favicon-16.png", "apple-touch-icon.png", "trendtribe_logo.svg"],
      manifest: {
        name: "Trend Tribe",
        short_name: "TrendTribe",
        description: "The student-only marketplace to buy, sell, and trade within your campus community.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "browser"],
        orientation: "portrait-primary",
        background_color: "#ffffff",
        theme_color: "#1340B8",
        categories: ["shopping", "lifestyle"],
        lang: "en",
        dir: "ltr",
        icons: [
          { src: "/favicon-32.png", sizes: "32x32", type: "image/png" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Marketplace", url: "/marketplace", description: "Browse listings", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
          { name: "My Listings", url: "/my-listings", description: "Manage your listings", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
        ],
        screenshots: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp}"],
        importScripts: ["/push-handler.js"],
        // Offline fallback: SPA shell
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "cloudinary-images", expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /^https:\/\/trendtribe\.app\/api\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", networkTimeoutSeconds: 4, expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 } },
          },
          {
            // local dev/api proxy fallback
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache-local", networkTimeoutSeconds: 4, expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 } },
          },
        ],
      },
      devOptions: { enabled: false, navigateFallback: "index.html" },
    }),
  ],
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
