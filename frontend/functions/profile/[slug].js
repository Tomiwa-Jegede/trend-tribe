// frontend/functions/profile/[slug].js — Cloudflare Pages Function for crawler OG tags
// Mirrors frontend/netlify/edge-functions/profile-meta.js but for Cloudflare.
// WhatsApp/Facebook/Twitter bots don't run JS, so Helmet tags in ProfilePage.jsx are invisible.

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

  if (!CRAWLER_UA_REGEX.test(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const slug = url.pathname.split("/profile/")[1]?.split("/")[0]?.split("?")[0]?.split("#")[0];
  if (!slug) return context.next();

  const siteUrl = url.origin;
  const profileUrl = `${siteUrl}/profile/${slug}`;

  try {
    const apiRes = await fetch(`${API_BASE}/listings/user/${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json", "User-Agent": "TrendTribe-OG/1.0" },
    });
    if (!apiRes.ok) throw new Error(`API ${apiRes.status}`);
    const { seller } = await apiRes.json();
    if (!seller) throw new Error("no seller");

    const title = escapeHtml(`${seller.fullName || seller.username} (@${seller.username}) — Trend Tribe`);
    const description = escapeHtml(
      (seller.bio || seller.school || `Student at ${seller.school || "Trend Tribe"}`).slice(0, 160) || "Student marketplace for campus communities"
    );
    const rawImage = seller.avatar && String(seller.avatar).trim() ? String(seller.avatar).trim() : `${siteUrl}/icon-512.png`;
    const image = rawImage.startsWith("http://") ? rawImage.replace(/^http:\/\//i, "https://") : rawImage;
    const imageSecure = image.startsWith("https://") ? image : image.replace(/^http:\/\//i, "https://");
    const imageType = image.toLowerCase().endsWith(".png") ? "image/png" : image.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg";
    const imageAlt = escapeHtml(`${seller.fullName || seller.username}'s profile photo — ${seller.username} on Trend Tribe`);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageSecure)}" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta property="og:image:alt" content="${imageAlt}" />
    <meta property="og:url" content="${escapeHtml(profileUrl)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="Trend Tribe" />
    <meta property="profile:username" content="${escapeHtml(seller.username || "")}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(imageSecure)}" />
    <meta name="twitter:image:alt" content="${imageAlt}" />
    <link rel="canonical" href="${escapeHtml(profileUrl)}" />
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
    console.error("[profile-og] error", err);
    return context.next();
  }
}
