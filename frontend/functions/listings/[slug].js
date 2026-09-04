// frontend/functions/listings/[slug].js — Cloudflare Pages Function for crawler OG tags
// Mirrors frontend/netlify/edge-functions/listing-meta.js but for Cloudflare.
// WhatsApp/Facebook/Twitter bots fetch without JS, so Helmet tags in ListingDetailPage.jsx:229 never run.
// This function serves bots a tiny HTML with real og:image/title/price from the API.

const API_BASE = "https://trend-tribe.onrender.com/api";

const CRAWLER_UA_REGEX =
  /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|SkypeUriPreview|vkShare|redditbot|Applebot|W3C_Validator/i;

const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export async function onRequest(context) {
  const request = context.request;
  const userAgent = request.headers.get("user-agent") || "";

  // Human → pass through to SPA (no latency)
  if (!CRAWLER_UA_REGEX.test(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const slug = url.pathname.split("/listings/")[1]?.split("/")[0]?.split("?")[0];
  if (!slug) return context.next();

  const siteUrl = url.origin;
  const listingUrl = `${siteUrl}/listings/${slug}`;

  try {
    const apiRes = await fetch(`${API_BASE}/listings/${encodeURIComponent(slug)}`, {
      headers: { "User-Agent": "TrendTribe-OG/1.0" },
    });
    if (!apiRes.ok) throw new Error(`API ${apiRes.status}`);
    const { listing } = await apiRes.json();
    if (!listing) throw new Error("no listing");

    const title = escapeHtml(listing.title || "Trend Tribe Listing");
    const price = Number(listing.price || 0).toLocaleString("en-NG");
    const description = escapeHtml(
      (listing.description || "").slice(0, 160) || "Check out this listing on Trend Tribe."
    );
    const image =
      listing.images && listing.images.length > 0 && listing.images[0]
        ? listing.images[0]
        : `${siteUrl}/trendtribe_logo.png`;
    const imageSecure = image.startsWith("http://") ? image.replace("http://", "https://") : image;

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title} — Trend Tribe</title>
    <meta property="og:title" content="${title} — ₦${price}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${escapeHtml(imageSecure)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="og:url" content="${listingUrl}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="Trend Tribe" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title} — ₦${price}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(imageSecure)}" />
    <meta http-equiv="refresh" content="0;url=${listingUrl}" />
  </head>
  <body></body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[listing-og] error", err);
    return context.next();
  }
}
