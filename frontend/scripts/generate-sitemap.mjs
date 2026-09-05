// scripts/generate-sitemap.mjs — fetch dynamic sitemap from backend at build time
// Ponytail: try once, fallback silently to static public/sitemap.xml
import fs from "fs";

const API_URL = process.env.VITE_API_URL || process.env.API_URL || "http://localhost:5050";
const origin = API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
const sitemapUrl = `${origin}/sitemap.xml`;
const fallbackUrl = `${origin}/api/sitemap.xml`;

async function fetchSitemap(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

try {
  let xml;
  try {
    xml = await fetchSitemap(sitemapUrl);
  } catch {
    xml = await fetchSitemap(fallbackUrl);
  }
  // validate looks like xml
  if (!xml.includes("<urlset")) throw new Error("invalid sitemap");
  const out = "public/sitemap.xml";
  fs.writeFileSync(out, xml);
  console.log(`[sitemap] wrote dynamic sitemap (${xml.length} bytes) from ${sitemapUrl} → ${out}`);
} catch (e) {
  console.warn(`[sitemap] dynamic fetch failed (${e.message}), keeping static public/sitemap.xml`);
}
