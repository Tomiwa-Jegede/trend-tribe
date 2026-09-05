// src/controllers/listing.controller.js

const prisma = require("../db");
const { askGeminiVision } = require("../utils/gemini");
const cloudinary = require("../config/cloudinary");
const { generateUniqueSlug, resolveListingWhere } = require("../utils/slug");

// ─── Helper: format listing for API response ──────────────────
const formatListing = (listing) => ({
  ...listing,
  price: parseFloat(listing.price),
});

// Admin-only fields that must not leak to public responses
const stripAdminFields = (listing) => {
  if (!listing) return listing;
  const { contactViews, contactViewLogs, ...rest } = listing;
  return rest;
};

// ─── Helper: resolve listing by slug or numeric id (backwards compat) ──
const findListingByIdentifier = async (identifier, extraInclude = undefined) => {
  const { isNumeric, id, slug } = resolveListingWhere(identifier);
  if (isNumeric) {
    let listing = await prisma.listing.findUnique({ where: { slug }, include: extraInclude });
    if (listing) return listing;
    return prisma.listing.findUnique({ where: { id }, include: extraInclude });
  }
  let listing = await prisma.listing.findUnique({ where: { slug }, include: extraInclude });
  if (listing) return listing;
  // Fallback for old slugs without hash (e.g., "plain-tees" → "plain-tees-a1b2c3")
  // Try prefix match so old shared links still show product image
  return prisma.listing.findFirst({ where: { slug: { startsWith: slug } }, include: extraInclude });
};

// ─── Helper: check listing exists + verify ownership ──────────
const findAndVerifyListing = async (identifier, userId) => {
  const listing = await findListingByIdentifier(identifier);
  if (!listing) return { error: "Listing not found", status: 404 };
  if (listing.sellerId !== userId) {
    return { error: "You are not authorized to modify this listing", status: 403 };
  }
  return { listing };
};

// ─── Helper: delete images from Cloudinary ───────────────────
const deleteFromCloudinary = async (publicIds = []) => {
  if (publicIds.length === 0) return;
  await Promise.allSettled(
    publicIds.map((id) => cloudinary.uploader.destroy(id)),
  );
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings
// ─────────────────────────────────────────────────────────────
const getAllListings = async (req, res) => {
  try {
        const {
        search,
        category,
        subcategory,
        condition,
        minPrice,
        maxPrice,
        page = 1,
        limit = 12,
        sort = "newest",
      } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const where = { isAvailable: true };

    // Featured boost filter: ?boosted=true returns only currently boosted (Marketplace top only)
    if (req.query.boosted === "true") {
      where.boostedUntil = { gt: new Date() };
    }

    if (search?.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

        if (category) where.category = category.toUpperCase();
      if (subcategory) where.subcategory = subcategory.toUpperCase();
      if (condition) where.condition = condition.toUpperCase();

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const orderByMap = {
      newest: { createdAt: "desc" },
      oldest: { createdAt: "asc" },
      price_asc: { price: "asc" },
      price_desc: { price: "desc" },
    };
    // Boosted first (future boostedUntil), then by chosen sort — Featured row is product cards on Marketplace top only
    const sortOrder = orderByMap[sort] || orderByMap.newest;
    const orderBy = [
      { boostedUntil: { sort: "desc", nulls: "last" } },
      sortOrder,
    ];

    const [listings, totalCount] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          seller: {
            select: {
              id: true,
              slug: true,
              username: true,
              fullName: true,
              avatar: true,
              school: true,
            },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    // Log search for analytics (non-blocking)
    if (search?.trim()) {
      prisma.searchLog.create({
        data: {
          query: search.trim().slice(0, 100),
          category: category || null,
          userId: req.user?.id || null,
          results: totalCount,
        },
      }).catch(() => {});
    }

    return res.status(200).json({
      listings: listings.map((l) => formatListing(stripAdminFields(l))),
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
          filters: {
          search: search || null,
          category: category || null,
          subcategory: subcategory || null,
          condition: condition || null,
          minPrice: minPrice || null,
          maxPrice: maxPrice || null,
          sort,
        },
    });
  } catch (err) {
    console.error("[GET ALL LISTINGS ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
// ─────────────────────────────────────────────────────────────
// POST /api/listings/image-search
// ─────────────────────────────────────────────────────────────
const searchListingsByImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imageBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    const prompt =
      "Look at this photo of an item someone wants to sell or find on a campus marketplace. " +
      'Respond ONLY with JSON in this exact shape: {"keywords": "a few short search words describing the item, e.g. category + notable features"}. ' +
      "No extra text, no markdown.";

    let keywords;
    try {
      const raw = await askGeminiVision(prompt, imageBase64, mimeType);
      const parsed = JSON.parse(raw);
      keywords = parsed?.keywords?.trim();
    } catch (geminiErr) {
      console.error("[IMAGE SEARCH GEMINI ERROR]", geminiErr);
      return res.status(502).json({ error: "Could not analyze the image. Try again." });
    }

    if (!keywords) {
      return res.status(422).json({ error: "Could not identify anything searchable in that photo." });
    }

    const where = {
      isAvailable: true,
      OR: [
        { title: { contains: keywords, mode: "insensitive" } },
        { description: { contains: keywords, mode: "insensitive" } },
      ],
    };

    const listings = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 24,
    });

    return res.status(200).json({
      keywords,
      listings: listings.map(formatListing),
    });
  } catch (err) {
    console.error("[IMAGE SEARCH ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
// ─────────────────────────────────────────────────────────────
// GET /api/listings/:slug (also accepts numeric id for backwards compat)
// ─────────────────────────────────────────────────────────────
const getListingById = async (req, res) => {
  try {
    const identifier = req.params.id || req.params.slug;
    if (!identifier) return res.status(400).json({ error: "Invalid listing identifier" });

    const listing = await findListingByIdentifier(identifier, {
      seller: {
        select: {
          id: true,
              slug: true,
          username: true,
          fullName: true,
          avatar: true,
          school: true,
          bio: true,
          createdAt: true,
          listings: { where: { isAvailable: true }, select: { id: true } },
        },
      },
    });

    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const { listings: sellerListings, ...sellerFields } = listing.seller;
    const cleaned = stripAdminFields(listing);
    cleaned.seller = undefined;

    return res.status(200).json({
      listing: {
        ...formatListing(cleaned),
        seller: { ...sellerFields, activeListings: sellerListings.length },
      },
    });
  } catch (err) {
    console.error("[GET LISTING BY ID ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/listings ← PROTECTED
// ─────────────────────────────────────────────────────────────
const FREE_LISTING_LIMIT = 3;

const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      subcategory,
      condition,
      images,
      imagePublicIds,
      coverPosition,
      location,
    } = req.body;

    // ── Enforce free-slot limit, then fall back to token spend ──
    const activeListingCount = await prisma.listing.count({
      where: { sellerId: req.user.id, isAvailable: true },
    });

    const isAdmin = req.user.role === "ADMIN";
    let usingFreeSlot = isAdmin || activeListingCount < FREE_LISTING_LIMIT;
    const { confirmSpend } = req.body;

    // ── 0.5 token per extra image beyond 3 (max 5 images)
    const imageCount = Array.isArray(images) ? images.length : 0;
    const extraImages = Math.max(0, imageCount - 3);
    const imageCost = extraImages * 0.5;
    const listingCost = usingFreeSlot ? 0 : 1;
    const totalCost = listingCost + imageCost;

    if (!isAdmin && totalCost > 0) {
      const seller = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { tokenBalance: true },
      });

      if (!seller || seller.tokenBalance < totalCost) {
        const parts = [];
        if (listingCost) parts.push("1 token for extra listing (beyond 3 free)");
        if (imageCost) parts.push(`${imageCost} token${imageCost !== 1 ? "s" : ""} for ${extraImages} extra image${extraImages !== 1 ? "s" : ""} (3 free)`);
        return res.status(403).json({
          error: `Not enough tokens. Need ${totalCost} tokens: ${parts.join(" + ")}. You have ${seller?.tokenBalance ?? 0}.`,
          limitReached: !usingFreeSlot,
          currentCount: activeListingCount,
          freeSlotLimit: FREE_LISTING_LIMIT,
          tokenBalance: seller?.tokenBalance ?? 0,
          totalCost,
          breakdown: { listingCost, imageCost, extraImages },
        });
      }

      if (!confirmSpend) {
        const parts = [];
        if (listingCost) parts.push("1 token for extra listing");
        if (imageCost) parts.push(`${imageCost} tokens for ${extraImages} extra image${extraImages !== 1 ? "s" : ""}`);
        return res.status(402).json({
          needsTokenConfirm: true,
          tokenBalance: seller.tokenBalance,
          totalCost,
          breakdown: { listingCost, imageCost, extraImages },
          error: `This will use ${totalCost} token${totalCost !== 1 ? "s" : ""} (${parts.join(" + ")}). Confirm to continue.`,
        });
      }
    }

      const slug = await generateUniqueSlug(prisma, title);
      const listingData = {
        slug,
        title,
        description,
        price,
        category,
        subcategory: subcategory || null,
        condition,
        images: images || [],
        imagePublicIds: imagePublicIds || [],
        coverPosition: coverPosition || { x: 50, y: 50 },
        location: location || null,
        sellerId: req.user.id,
      };

    const listingInclude = {
      seller: {
        select: {
          id: true,
              slug: true,
          username: true,
          fullName: true,
          avatar: true,
          school: true,
          whatsapp: true,
        },
      },
    };

    const needsPayment = !isAdmin && totalCost > 0;
    const listing = !needsPayment
      ? await prisma.listing.create({ data: listingData, include: listingInclude })
      : await prisma.$transaction(async (tx) => {
          const updatedSeller = await tx.user.updateMany({
            where: { id: req.user.id, tokenBalance: { gte: totalCost } },
            data: { tokenBalance: { decrement: totalCost } },
          });

          if (updatedSeller.count === 0) {
            throw new Error("TOKEN_BALANCE_RACE");
          }

          return tx.listing.create({ data: listingData, include: listingInclude });
        });

    // Admin bell: new listing (in-app pull)
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({ userId: a.id, actorId: req.user.id, listingId: listing.id, type: "NEW_LISTING" })),
        });
        // realtime admin bell
        try { const { emitNotification } = require("../realtime"); admins.forEach((a) => emitNotification(a.id, { type: "NEW_LISTING", listingId: listing.id, actorId: req.user.id })); } catch {}
      }
    } catch (e) {
      console.error("[ADMIN NOTIF NEW_LISTING ERROR]", e.message);
    }

    // realtime: new listing to marketplace
    try { const { emitListing } = require("../realtime"); emitListing("created", listing); } catch {}

    return res.status(201).json({
      message: "Listing created successfully ✅",
      listing: formatListing(stripAdminFields(listing)),
    });
  } catch (err) {
    if (err.message === "TOKEN_BALANCE_RACE") {
      return res.status(403).json({
        error: "Your token balance changed before this could complete. Please check your balance and try again.",
        limitReached: true,
      });
    }
    console.error("[CREATE LISTING ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/listings/:slug ← PROTECTED + OWNER ONLY
// ─────────────────────────────────────────────────────────────
const updateListing = async (req, res) => {
  try {
    const identifier = req.params.id || req.params.slug;
    if (!identifier) return res.status(400).json({ error: "Invalid listing identifier" });

    const { error, status, listing } = await findAndVerifyListing(identifier, req.user.id);
    if (error) return res.status(status).json({ error });

const {
  title,
  description,
  price,
  category,
  subcategory,
  condition,
  images,
  imagePublicIds,
  coverPosition,
  location,
  isAvailable,
  confirmSpend,
} = req.body;

    // ── Combined token cost: re-activation (1) + extra images beyond 3 (0.5 each, delta only) ──
    const isAdmin = req.user.role === "ADMIN";
    let reactivationCost = 0;
    let imageDeltaCost = 0;
    let activeCountForMsg = null;

    if (isAvailable === true && listing.isAvailable === false) {
      const activeCount = await prisma.listing.count({
        where: { sellerId: req.user.id, isAvailable: true },
      });
      activeCountForMsg = activeCount;
      if (!isAdmin && activeCount >= FREE_LISTING_LIMIT) {
        reactivationCost = 1;
      }
    }

    if (images !== undefined) {
      const newCount = Array.isArray(images) ? images.length : 0;
      const oldCount = Array.isArray(listing.images) ? listing.images.length : 0;
      const newExtra = Math.max(0, newCount - 3);
      const oldExtra = Math.max(0, oldCount - 3);
      const deltaExtra = Math.max(0, newExtra - oldExtra);
      if (deltaExtra > 0) imageDeltaCost = deltaExtra * 0.5;
    }

    const totalUpdateCost = reactivationCost + imageDeltaCost;

    if (!isAdmin && totalUpdateCost > 0) {
      const seller = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { tokenBalance: true },
      });
      if (!seller || seller.tokenBalance < totalUpdateCost) {
        const parts = [];
        if (reactivationCost) parts.push("1 token to re-activate (beyond 3 free)");
        if (imageDeltaCost) parts.push(`${imageDeltaCost} token${imageDeltaCost !== 1 ? "s" : ""} for ${imageDeltaCost / 0.5} extra image${imageDeltaCost / 0.5 !== 1 ? "s" : ""} (3 free)`);
        return res.status(403).json({
          error: `Not enough tokens. Need ${totalUpdateCost} tokens: ${parts.join(" + ")}. You have ${seller?.tokenBalance ?? 0}.`,
          limitReached: reactivationCost > 0,
          currentCount: activeCountForMsg,
          freeSlotLimit: FREE_LISTING_LIMIT,
          tokenBalance: seller?.tokenBalance ?? 0,
          totalCost: totalUpdateCost,
          breakdown: { reactivationCost, imageDeltaCost },
        });
      }
      if (!confirmSpend) {
        const parts = [];
        if (reactivationCost) parts.push("1 token to re-activate");
        if (imageDeltaCost) parts.push(`${imageDeltaCost} tokens for extra image${imageDeltaCost / 0.5 !== 1 ? "s" : ""}`);
        return res.status(402).json({
          needsTokenConfirm: true,
          tokenBalance: seller.tokenBalance,
          totalCost: totalUpdateCost,
          breakdown: { reactivationCost, imageDeltaCost },
          error: `This will use ${totalUpdateCost} token${totalUpdateCost !== 1 ? "s" : ""} (${parts.join(" + ")}). Confirm to continue.`,
        });
      }
    }

    const updateData = {};
    if (title !== undefined) {
      updateData.title = title;
      if (title !== listing.title) {
        updateData.slug = await generateUniqueSlug(prisma, title, listing.id);
      }
    }
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
         if (category !== undefined) updateData.category = category;
      if (subcategory !== undefined) updateData.subcategory = subcategory || null;
      if (condition !== undefined) updateData.condition = condition;
    if (location !== undefined) updateData.location = location;
    if (isAvailable !== undefined) {
      updateData.isAvailable = isAvailable;
      if (isAvailable === false && listing.isAvailable === true) {
        updateData.soldAt = new Date();
      } else if (isAvailable === true && listing.isAvailable === false) {
        updateData.soldAt = null;
        updateData.archivedAt = null;
      }
    }
    if (images !== undefined) updateData.images = images;
    if (imagePublicIds !== undefined)
      updateData.imagePublicIds = imagePublicIds;
    if (coverPosition !== undefined) updateData.coverPosition = coverPosition;
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided for update" });
    }

    // If images are being replaced, delete the old ones from Cloudinary
    if (images !== undefined) {
      const removedPublicIds = listing.imagePublicIds.filter(
        (pid) => !(imagePublicIds || []).includes(pid),
      );
      await deleteFromCloudinary(removedPublicIds);
    }

    updateData.editCount = { increment: 1 };

    let updated;
    if (totalUpdateCost > 0 && !isAdmin) {
      try {
        updated = await prisma.$transaction(async (tx) => {
          const updatedSeller = await tx.user.updateMany({
            where: { id: req.user.id, tokenBalance: { gte: totalUpdateCost } },
            data: { tokenBalance: { decrement: totalUpdateCost } },
          });
          if (updatedSeller.count === 0) throw new Error("TOKEN_BALANCE_RACE");
          return tx.listing.update({
            where: { id: listing.id },
            data: updateData,
            include: {
              seller: { select: { id: true,
              slug: true, username: true, fullName: true, avatar: true, school: true, whatsapp: true } },
            },
          });
        });
      } catch (e) {
        if (e.message === "TOKEN_BALANCE_RACE") {
          return res.status(403).json({ error: "Your token balance changed before this could complete.", limitReached: true });
        }
        throw e;
      }
    } else {
      updated = await prisma.listing.update({
        where: { id: listing.id },
        data: updateData,
        include: {
          seller: {
            select: {
              id: true,
              slug: true,
              username: true,
              fullName: true,
              avatar: true,
              school: true,
            whatsapp: true,
            },
          },
        },
      });
    }

    try { const { emitListing } = require("../realtime"); emitListing("updated", updated); } catch {}
    return res.status(200).json({
      message: "Listing updated successfully ✅",
      listing: formatListing(stripAdminFields(updated)),
    });
  } catch (err) {
    console.error("[UPDATE LISTING ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/listings/:slug ← PROTECTED + OWNER ONLY
// ─────────────────────────────────────────────────────────────
const deleteListing = async (req, res) => {
  try {
    const identifier = req.params.id || req.params.slug;
    if (!identifier) return res.status(400).json({ error: "Invalid listing identifier" });

    const { error, status, listing } = await findAndVerifyListing(identifier, req.user.id);
    if (error) return res.status(status).json({ error });

    // Delete images from Cloudinary first
    await deleteFromCloudinary(listing.imagePublicIds);

    await prisma.listing.delete({ where: { id: listing.id } });
    try { const { emitListing } = require("../realtime"); emitListing("deleted", { id: listing.id, sellerId: listing.sellerId }); } catch {}

    return res.status(200).json({ message: "Listing deleted successfully ✅" });
  } catch (err) {
    console.error("[DELETE LISTING ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings/me ← PROTECTED (seller home)
// ─────────────────────────────────────────────────────────────
const getMyListings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { available, page = 1, limit = 12, sort = "newest" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const where = { sellerId: userId };
    if (available === "true") where.isAvailable = true;
    if (available === "false") where.isAvailable = false;

    const orderByMap = {
      newest: { createdAt: "desc" },
      oldest: { createdAt: "asc" },
      price_asc: { price: "asc" },
      price_desc: { price: "desc" },
    };
    const orderBy = orderByMap[sort] || orderByMap.newest;

    const [listings, totalCount] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          _count: { select: { favorites: true, reports: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      listings: listings.map((l) => ({
        ...formatListing(stripAdminFields(l)),
        favoriteCount: l._count.favorites,
        reportCount: l._count.reports,
      })),
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (err) {
    console.error("[GET MY LISTINGS ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// Job: 30d ghost prune — flips isAvailable=false + archivedAt for stale listings
// ─────────────────────────────────────────────────────────────
const archiveGhostListings = async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await prisma.listing.updateMany({
      where: { isAvailable: true, createdAt: { lt: cutoff } },
      data: { isAvailable: false, archivedAt: new Date() },
    });
    if (result.count > 0) console.log(`🧹 Ghost prune archived ${result.count} stale listing(s)`);
    return result.count;
  } catch (err) {
    console.error("[GHOST PRUNE ERROR]", err.message);
    return 0;
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/listings/:slug/boost ← PROTECTED (Marketplace top only)
// 1 token = 24h featured product card on Marketplace top
// ─────────────────────────────────────────────────────────────
const boostListing = async (req, res) => {
  try {
    const identifier = req.params.id || req.params.slug;
    if (!identifier) return res.status(400).json({ error: "Invalid listing identifier" });
    const { error, status, listing } = await findAndVerifyListing(identifier, req.user.id);
    if (error) return res.status(status).json({ error });
    if (!listing.isAvailable) return res.status(400).json({ error: "Only active listings can be boosted" });
    if (listing.boostedUntil && new Date(listing.boostedUntil) > new Date()) {
      return res.status(400).json({ error: "This listing is already boosted" });
    }
    const { confirmSpend } = req.body;
    const seller = await prisma.user.findUnique({ where: { id: req.user.id }, select: { tokenBalance: true } });
    if (!seller || seller.tokenBalance < 1) {
      return res.status(403).json({ error: "You need 1 token to boost for 24h.", tokenBalance: seller?.tokenBalance ?? 0 });
    }
    if (!confirmSpend) {
      return res.status(402).json({ needsTokenConfirm: true, tokenBalance: seller.tokenBalance, error: "Boost this listing to Featured for 24h? This will use 1 token." });
    }
    const now = new Date();
    const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const updated = await prisma.$transaction(async (tx) => {
      const ok = await tx.user.updateMany({ where: { id: req.user.id, tokenBalance: { gte: 1 } }, data: { tokenBalance: { decrement: 1 } } });
      if (ok.count === 0) throw new Error("TOKEN_BALANCE_RACE");
      return tx.listing.update({ where: { id: listing.id }, data: { boostedAt: now, boostedUntil: until } });
    });
    try { const { emitListing } = require("../realtime"); emitListing("boosted", updated); } catch {}
    return res.status(200).json({ message: "Listing boosted for 24h ✅", listing: formatListing(updated) });
  } catch (err) {
    if (err.message === "TOKEN_BALANCE_RACE") return res.status(403).json({ error: "Token balance changed, try again." });
    console.error("[BOOST LISTING ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings/user/:identifier (slug or id)
// ─────────────────────────────────────────────────────────────
const getListingsByUser = async (req, res) => {
  try {
    const identifier = req.params.userId;
    if (!identifier) return res.status(400).json({ error: "Invalid user identifier" });

    let user = await prisma.user.findUnique({
      where: { slug: identifier },
      select: { id: true, slug: true, username: true, fullName: true, avatar: true, school: true, bio: true, role: true },
    });
    if (!user) {
      const asInt = parseInt(identifier, 10);
      if (!isNaN(asInt) && String(asInt) === String(identifier).trim()) {
        user = await prisma.user.findUnique({
          where: { id: asInt },
          select: { id: true, slug: true, username: true, fullName: true, avatar: true, school: true, bio: true, role: true },
        });
        // fallback prefix for old slugs without hash
        if (!user) {
          user = await prisma.user.findFirst({
            where: { slug: { startsWith: identifier } },
            select: { id: true, slug: true, username: true, fullName: true, avatar: true, school: true, bio: true, role: true },
          });
        }
      } else {
        user = await prisma.user.findFirst({
          where: { slug: { startsWith: identifier } },
          select: { id: true, slug: true, username: true, fullName: true, avatar: true, school: true, bio: true, role: true },
        });
      }
    }

    if (!user) return res.status(404).json({ error: "User not found" });
    const userId = user.id;

    const { available, page = 1, limit = 12, sort = "newest" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const where = { sellerId: userId };
    if (available === "true") where.isAvailable = true;
    if (available === "false") where.isAvailable = false;

    const orderByMap = {
      newest: { createdAt: "desc" },
      oldest: { createdAt: "asc" },
      price_asc: { price: "asc" },
      price_desc: { price: "desc" },
    };
    const orderBy = orderByMap[sort] || orderByMap.newest;

    const [listings, totalCount] = await Promise.all([
      prisma.listing.findMany({ where, orderBy, skip, take: limitNum }),
      prisma.listing.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      seller: user,
      listings: listings.map((l) => formatListing(stripAdminFields(l))),
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (err) {
    console.error("[GET LISTINGS BY USER ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/listings/:slug/report ← PROTECTED
// ─────────────────────────────────────────────────────────────
const reportListing = async (req, res) => {
  try {
    const identifier = req.params.id || req.params.slug;
    if (!identifier) return res.status(400).json({ error: "Invalid listing identifier" });

    const { reason } = req.body;
    const validReasons = ["SCAM", "FAKE_ITEM", "INAPPROPRIATE_CONTENT", "OTHER"];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: "Invalid report reason" });
    }

    const listing = await findListingByIdentifier(identifier);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    const listingId = listing.id;

    if (listing.sellerId === req.user.id) {
      return res.status(400).json({ error: "You cannot report your own listing" });
    }

    const existing = await prisma.report.findUnique({
      where: { listingId_reporterId: { listingId, reporterId: req.user.id } },
    });
    if (existing) {
      return res.status(409).json({ error: "You have already reported this listing" });
    }

    await prisma.report.create({
      data: { listingId, reporterId: req.user.id, reason },
    });

    return res.status(201).json({ message: "Listing reported. Thank you for helping keep the marketplace safe." });
  } catch (err) {
    console.error("[REPORT LISTING ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings/:slug/contact ← PROTECTED
// Reveals the seller's WhatsApp/phone number, gated by token credits.
// 1 token = 4 views, every view counts (no caching of "already viewed").
// Now also tracks contact view clicks per listing for seller analytics.
// ─────────────────────────────────────────────────────────────
const revealContact = async (req, res) => {
  try {
    const identifier = req.params.id || req.params.slug;
    if (!identifier) return res.status(400).json({ error: "Invalid listing identifier" });

    const _listing = await findListingByIdentifier(identifier);
    if (!_listing) return res.status(404).json({ error: "Listing not found" });
    const id = _listing.id;

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        sellerId: true,
        seller: { select: { whatsapp: true } },
      },
    });

    if (!listing) return res.status(404).json({ error: "Listing not found" });

    // Track view — don't block response if tracking fails
    // Don't count owner's own clicks; count only authenticated non-owner views
    const viewerId = req.user?.id;
    const isOwner = viewerId && listing.sellerId === viewerId;
    if (viewerId && !isOwner) {
      prisma.$transaction([
        prisma.listing.update({
          where: { id },
          data: { contactViews: { increment: 1 } },
        }),
        prisma.contactView.create({
          data: { listingId: id, viewerId },
        }),
      ]).catch((e) => console.error("[CONTACT VIEW TRACK ERROR]", e.message));
    } else if (!isOwner) {
      // Anonymous fallback (should not happen — route is protected — but safe)
      prisma.listing.update({
        where: { id },
        data: { contactViews: { increment: 1 } },
      }).catch((e) => console.error("[CONTACT VIEW TRACK ERROR]", e.message));
    }

    return res.status(200).json({ whatsapp: listing.seller.whatsapp });
  } catch (err) {
    console.error("[REVEAL CONTACT ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/listings/:slug/favorite ← PROTECTED
// Toggles a favorite on/off for the current user.
// ─────────────────────────────────────────────────────────────
const toggleFavorite = async (req, res) => {
  try {
    const identifier = req.params.id || req.params.slug;
    if (!identifier) return res.status(400).json({ error: "Invalid listing identifier" });

    const _l = await findListingByIdentifier(identifier);
    if (!_l) return res.status(404).json({ error: "Listing not found" });
    const listingId = _l.id;
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true },
    });
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const existing = await prisma.favorite.findUnique({
      where: {
        listingId_userId: { listingId, userId: req.user.id },
      },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      try { const { emitFavorite } = require("../realtime"); emitFavorite(listingId, req.user.id, false); } catch {}
      return res.status(200).json({ favorited: false });
    }

    await prisma.favorite.create({
      data: { listingId, userId: req.user.id },
    });
     // Bell-only notification for seller (in-app pull + push when app closed)
    if (listing.sellerId !== req.user.id) {
      try {
        await prisma.notification.create({
          data: { userId: listing.sellerId, actorId: req.user.id, listingId, type: "FAVORITE" },
        });
        // Push even when PWA not open
        const { sendPushToUser } = require("../utils/push");
        const unread = await prisma.notification.count({ where: { userId: listing.sellerId, read: false } }).catch(() => 1);
        sendPushToUser(prisma, listing.sellerId, {
          title: "Trend Tribe — New favorite ♥",
          body: "Someone saved your listing",
          url: "/notifications",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          badgeCount: unread,
          tag: `fav-${listingId}`,
        }).catch(() => {});
        // badge update via push
        if ("setAppBadge" in globalThis) {}
        // realtime: notify seller instantly + favorite toggle
        try {
          const { emitFavorite, emitNotification } = require("../realtime");
          emitFavorite(listingId, req.user.id, true);
          // fetch created notification for payload
          const n = await prisma.notification.findFirst({ where: { userId: listing.sellerId, actorId: req.user.id, listingId, type: "FAVORITE" }, orderBy: { createdAt: "desc" } });
          if (n) emitNotification(listing.sellerId, n);
        } catch {}
      } catch (e) {
        console.error("[NOTIFICATION CREATE ERROR]", e.message);
      }
    } else {
      try { const { emitFavorite } = require("../realtime"); emitFavorite(listingId, req.user.id, true); } catch {}
    }
    return res.status(201).json({ favorited: true });
  } catch (err) {
    console.error("[TOGGLE FAVORITE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings/favorites/ids ← PROTECTED
// Lightweight list of listing IDs the current user has favorited,
// used by the frontend to mark hearts as filled across any grid.
// ─────────────────────────────────────────────────────────────
const getMyFavoriteIds = async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      select: { listingId: true },
    });
    return res.status(200).json({ ids: favorites.map((f) => f.listingId) });
  } catch (err) {
    console.error("[GET FAVORITE IDS ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings/favorites/mine ← PROTECTED
// Full favorited listings for a "My Favorites" page.
// ─────────────────────────────────────────────────────────────
const getMyFavorites = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [favorites, totalCount] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          listing: {
            include: {
              seller: {
                select: {
                  id: true,
              slug: true,
                  username: true,
                  fullName: true,
                  avatar: true,
                  school: true,
                },
              },
            },
          },
        },
      }),
      prisma.favorite.count({ where: { userId: req.user.id } }),
    ]);

    const listings = favorites
      .filter((f) => f.listing)
      .map((f) => formatListing(f.listing));

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      listings,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (err) {
    console.error("[GET MY FAVORITES ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  archiveGhostListings,
  boostListing,
  getListingsByUser,
  reportListing,
  revealContact,
  searchListingsByImage,
  toggleFavorite,
  getMyFavoriteIds,
  getMyFavorites,
};
