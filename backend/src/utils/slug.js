// src/utils/slug.js — title → URL slug, unique

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-") // spaces → -
    .replace(/-+/g, "-") // collapse ---
    .replace(/^-+|-+$/g, "") // trim -
    .slice(0, 80) || "listing";
};

const generateUniqueSlug = async (prisma, title, excludeId = null) => {
  const base = slugify(title);
  // Always append 6-char hash for uniqueness (e.g., "plain-tees-a1b2c3")
  const genHash = () => Math.random().toString(36).substring(2, 8).toLowerCase();
  let slug = `${base}-${genHash()}`;
  if (slug.length > 100) slug = slug.slice(0, 100);
  let attempts = 0;
  while (true) {
    const existing = await prisma.listing.findUnique({ where: { slug } });
    if (!existing || (excludeId && existing.id === excludeId)) break;
    // collision — regen hash
    slug = `${base}-${genHash()}`;
    if (slug.length > 100) slug = slug.slice(0, 100);
    attempts++;
    if (attempts > 10) throw new Error("Failed to generate unique slug");
  }
  return slug;
};

const generateUniqueUserSlug = async (prisma, username, excludeId = null) => {
  const base = slugify(username);
  const genHash = () => Math.random().toString(36).substring(2, 8).toLowerCase();
  let slug = `${base}-${genHash()}`;
  if (slug.length > 100) slug = slug.slice(0, 100);
  let attempts = 0;
  while (true) {
    const existing = await prisma.user.findUnique({ where: { slug } });
    if (!existing || (excludeId && existing.id === excludeId)) break;
    slug = `${base}-${genHash()}`;
    if (slug.length > 100) slug = slug.slice(0, 100);
    attempts++;
    if (attempts > 10) throw new Error("Failed to generate unique user slug");
  }
  return slug;
};

const resolveListingWhere = (identifier) => {
  // Prefer slug lookup; fallback to numeric id for backwards compat
  const asInt = parseInt(identifier, 10);
  const isNumeric = !isNaN(asInt) && String(asInt) === String(identifier).trim();
  if (isNumeric) {
    // Try slug first? Numeric slug is unlikely (slugify removes numbers? keeps numbers, but pure numeric slug like "123" would be ambiguous)
    // For backwards compat we support id fallback via OR in caller
    return { isNumeric, id: asInt, slug: identifier };
  }
  return { isNumeric: false, slug: identifier };
};

module.exports = { slugify, generateUniqueSlug, generateUniqueUserSlug, resolveListingWhere };
