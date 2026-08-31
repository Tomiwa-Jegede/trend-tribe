// netlify/edge-functions/listing-meta.js
//
// Serves crawler-friendly Open Graph tags for individual listing pages
// (WhatsApp, Facebook, Twitter/X, etc. link-preview bots) so a shared
// listing link shows the real product image/title/price instead of the
// generic site logo. Real human visitors are passed straight through to
// the normal built index.html via context.next() — no extra fetch, no
// added latency, same as if this function didn't exist.

const API_BASE = "https://trend-tribe.onrender.com/api";

// Known link-preview crawler user agents
const CRAWLER_UA_REGEX =
  /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|SkypeUriPreview|vkShare|redditbot|Applebot|W3C_Validator/i;

const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export default async (request, context) => {
  const userAgent = request.headers.get("user-agent") || "";

  // Not a crawler → pass through to normal static serving, zero added cost
  if (!CRAWLER_UA_REGEX.test(userAgent)) {
    return context.next();
  }

  // Crawler request → fetch real listing data and build an OG-tagged page
  const url = new URL(request.url);
  const id = url.pathname.split("/listings/")[1];
  const siteUrl = url.origin;
  const listingUrl = `${siteUrl}/listings/${id}`;

  try {
    const apiRes = await fetch(`${API_BASE}/listings/${id}`);
    if (!apiRes.ok) throw new Error(`API returned ${apiRes.status}`);
    const { listing } = await apiRes.json();

    const title = escapeHtml(listing.title || "Trend Tribe Listing");
    const price = Number(listing.price || 0).toLocaleString("en-NG");
    const description = escapeHtml(
      (listing.description || "").slice(0, 160) || "Check out this listing on Trend Tribe."
    );
    const image =
      listing.images && listing.images.length > 0
        ? listing.images[0]
        : `${siteUrl}/trendtribe_logo.png`;

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title} — Trend Tribe</title>
    <meta property="og:title" content="${title} — ₦${price}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:url" content="${listingUrl}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title} — ₦${price}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  </head>
  <body></body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[listing-meta] error", err);
    // Fail safe: redirect the crawler to the normal listing page
    return Response.redirect(listingUrl, 302);
  }
};

export const config = {
  path: "/listings/:id",
};