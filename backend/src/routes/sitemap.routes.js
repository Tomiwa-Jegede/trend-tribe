// src/routes/sitemap.routes.js — dynamic sitemap (ponytail: one file, no deps)
const express = require("express");
const prisma = require("../db");

const router = express.Router();

const STATIC_URLS = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/marketplace", priority: "0.9", changefreq: "hourly" },
  { loc: "/about", priority: "0.6", changefreq: "monthly" },
  { loc: "/features", priority: "0.6", changefreq: "monthly" },
  { loc: "/faq", priority: "0.5", changefreq: "monthly" },
  { loc: "/pricing", priority: "0.5", changefreq: "monthly" },
  { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
  { loc: "/terms", priority: "0.3", changefreq: "yearly" },
];

let cache = { xml: null, expiresAt: 0 };
const CACHE_MS = 60 * 60 * 1000; // 1h

async function buildSitemapXml(baseUrl) {
  const origin = (baseUrl || process.env.CLIENT_URL || "https://trendtribe.app").split(",")[0].trim().replace(/\/$/, "");
  const urls = [...STATIC_URLS];

  try {
    const listings = await prisma.listing.findMany({
      where: { isAvailable: true, archivedAt: null },
      select: { slug: true, id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    for (const l of listings) {
      const slug = l.slug || String(l.id);
      urls.push({
        loc: `/listings/${slug}`,
        priority: "0.8",
        changefreq: "weekly",
        lastmod: l.updatedAt.toISOString().split("T")[0],
      });
    }
  } catch (e) {
    console.warn("[sitemap] listing fetch failed, serving static only", e.message);
  }

  const entries = urls
    .map(
      (u) => `  <url>
    <loc>${origin}${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

router.get("/", async (req, res) => {
  try {
    if (cache.xml && Date.now() < cache.expiresAt) {
      res.set("Content-Type", "application/xml");
      res.set("Cache-Control", "public, max-age=3600");
      return res.send(cache.xml);
    }
    const xml = await buildSitemapXml(req.headers.origin);
    cache = { xml, expiresAt: Date.now() + CACHE_MS };
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600");
    return res.send(xml);
  } catch (e) {
    console.error("[sitemap error]", e);
    return res.status(500).send("sitemap generation failed");
  }
});

module.exports = router;
