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
  let slug = base;
  let counter = 2;
  // Check existence, append -2, -3...
  while (true) {
    const existing = await prisma.listing.findUnique({ where: { slug } });
    if (!existing || (excludeId && existing.id === excludeId)) break;
    slug = `${base}-${counter}`;
    counter++;
    // safety: if base was 80 chars, ensure slug still <= 100
    if (slug.length > 100) slug = slug.slice(0, 100);
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

module.exports = { slugify, generateUniqueSlug, resolveListingWhere };
