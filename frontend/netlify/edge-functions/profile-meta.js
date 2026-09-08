// netlify/edge-functions/profile-meta.js
// Serves crawler-friendly Open Graph tags for profile pages
// Uses slug with hash, profile image as og:image, fallback to TrendTribe logo

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

export default async (request, context) => {
  const userAgent = request.headers.get("user-agent") || "";
  if (!CRAWLER_UA_REGEX.test(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const slug = url.pathname.split("/profile/")[1]?.split("/")[0]?.split("?")[0];
  if (!slug) return context.next();
  const siteUrl = url.origin;
  const profileUrl = `${siteUrl}/profile/${slug}`;

  try {
    const apiRes = await fetch(`${API_BASE}/listings/user/${encodeURIComponent(slug)}`, {
      headers: { "Accept": "application/json" },
    });
    if (!apiRes.ok) throw new Error(`API returned ${apiRes.status}`);
    const { seller } = await apiRes.json();
    if (!seller) throw new Error("No seller");

    const title = escapeHtml(`${seller.fullName || seller.username} (@${seller.username}) — Trend Tribe`);
    const description = escapeHtml(
      (seller.bio || seller.school || `Student at ${seller.school || "Trend Tribe"}`).slice(0, 160) || "Student marketplace for campus communities"
    );
    const image = seller.avatar && seller.avatar.trim()
      ? seller.avatar
      : `${siteUrl}/icon-512.png`;

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta property="og:url" content="${profileUrl}" />
    <meta property="og:type" content="profile" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
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
    console.error("[profile-meta] error", err);
    return Response.redirect(profileUrl, 302);
  }
};

export const config = {
  path: "/profile/:slug",
};
