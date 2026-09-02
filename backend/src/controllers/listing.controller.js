// src/controllers/listing.controller.js

const prisma = require("../db");
const { toDisplayTokens } = require("../utils/tokenFormat");
const { askGeminiVision } = require("../utils/gemini");
const cloudinary = require("../config/cloudinary");

// ─── Helper: format listing for API response ──────────────────
const formatListing = (listing) => ({
  ...listing,
  price: parseFloat(listing.price),
});

// ─── Helper: check listing exists + verify ownership ──────────
const findAndVerifyListing = async (listingId, userId) => {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) return { error: "Listing not found", status: 404 };

  if (listing.sellerId !== userId) {
    return {
      error: "You are not authorized to modify this listing",
      status: 403,
    };
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
    const orderBy = orderByMap[sort] || orderByMap.newest;

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

    return res.status(200).json({
      listings: listings.map(formatListing),
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
// GET /api/listings/:id
// ─────────────────────────────────────────────────────────────
const getListingById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid listing ID" });

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            school: true,
            bio: true,
            createdAt: true,
            listings: { where: { isAvailable: true }, select: { id: true } },
          },
        },
      },
    });

    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const { listings: sellerListings, ...sellerFields } = listing.seller;

    return res.status(200).json({
      listing: {
        ...formatListing(listing),
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

    if (!isAdmin && !usingFreeSlot) {
      const seller = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { tokenBalance: true },
      });

      if (!seller || seller.tokenBalance < 4) {
        return res.status(403).json({
          error: "You've used all your free listing slots and have no tokens left. Buy tokens to post another listing.",
          limitReached: true,
          currentCount: activeListingCount,
          freeSlotLimit: FREE_LISTING_LIMIT,
          tokenBalance: toDisplayTokens(seller?.tokenBalance ?? 0),
        });
      }

      if (!confirmSpend) {
        return res.status(402).json({
          needsTokenConfirm: true,
          tokenBalance: toDisplayTokens(seller.tokenBalance),
          error: "This will use 1 token to post beyond your 3 free listings. Confirm to continue.",
        });
      }
    }

      const listingData = {
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
        isFreeSlot: usingFreeSlot,
      };

    const listingInclude = {
      seller: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          school: true,
          whatsapp: true,
        },
      },
    };

    const listing = usingFreeSlot
      ? await prisma.listing.create({ data: listingData, include: listingInclude })
      : await prisma.$transaction(async (tx) => {
          const updatedSeller = await tx.user.updateMany({
            where: { id: req.user.id, tokenBalance: { gte: 4 } },
            data: { tokenBalance: { decrement: 4 } },
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
      }
    } catch (e) {
      console.error("[ADMIN NOTIF NEW_LISTING ERROR]", e.message);
    }

    return res.status(201).json({
      message: "Listing created successfully ✅",
      listing: formatListing(listing),
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
// PUT /api/listings/:id ← PROTECTED + OWNER ONLY
// ─────────────────────────────────────────────────────────────
const updateListing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid listing ID" });

    const { error, status, listing } = await findAndVerifyListing(
      id,
      req.user.id,
    );
    if (error) return res.status(status).json({ error });

    if (req.user.role !== "ADMIN" && !listing.isFreeSlot && listing.editCount >= 2) {
      return res.status(403).json({
        error: "This listing has reached its edit limit (2). Delete it and repost with a new token to make further changes.",
        editLimitReached: true,
      });
    }

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

    // ── Re-activation guard: hide→show that would exceed 3 active costs 1 token ──
    let reactivationRequiresToken = false;
    if (isAvailable === true && listing.isAvailable === false) {
      const activeCount = await prisma.listing.count({
        where: { sellerId: req.user.id, isAvailable: true },
      });
      const isAdmin = req.user.role === "ADMIN";
      if (!isAdmin && activeCount >= FREE_LISTING_LIMIT) {
        const seller = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { tokenBalance: true },
        });
        if (!seller || seller.tokenBalance < 4) {
          return res.status(403).json({
            error: "Re-activating this would give you 4 active listings. You need 1 token to have 4 up at once.",
            limitReached: true,
            currentCount: activeCount,
            freeSlotLimit: FREE_LISTING_LIMIT,
            tokenBalance: toDisplayTokens(seller?.tokenBalance ?? 0),
          });
        }
        if (!confirmSpend) {
          return res.status(402).json({
            needsTokenConfirm: true,
            tokenBalance: toDisplayTokens(seller.tokenBalance),
            error: "Re-activating this will use 1 token to have 4 active listings. Confirm to continue.",
          });
        }
        reactivationRequiresToken = true;
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
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

    if (!listing.isFreeSlot) {
      updateData.editCount = { increment: 1 };
    }

    let updated;
    if (reactivationRequiresToken) {
      try {
        updated = await prisma.$transaction(async (tx) => {
          const updatedSeller = await tx.user.updateMany({
            where: { id: req.user.id, tokenBalance: { gte: 4 } },
            data: { tokenBalance: { decrement: 4 } },
          });
          if (updatedSeller.count === 0) throw new Error("TOKEN_BALANCE_RACE");
          return tx.listing.update({
            where: { id },
            data: updateData,
            include: {
              seller: { select: { id: true, username: true, fullName: true, avatar: true, school: true, whatsapp: true } },
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
        where: { id },
        data: updateData,
        include: {
          seller: {
            select: {
              id: true,
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

    return res.status(200).json({
      message: "Listing updated successfully ✅",
      listing: formatListing(updated),
    });
  } catch (err) {
    console.error("[UPDATE LISTING ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/listings/:id ← PROTECTED + OWNER ONLY
// ─────────────────────────────────────────────────────────────
const deleteListing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid listing ID" });

    const { error, status, listing } = await findAndVerifyListing(
      id,
      req.user.id,
    );
    if (error) return res.status(status).json({ error });

    // Delete images from Cloudinary first
    await deleteFromCloudinary(listing.imagePublicIds);

    await prisma.listing.delete({ where: { id } });

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
        ...formatListing(l),
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
// GET /api/listings/user/:userId
// ─────────────────────────────────────────────────────────────
const getListingsByUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId))
      return res.status(400).json({ error: "Invalid user ID" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        school: true,
        bio: true,
        role: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

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
      listings: listings.map(formatListing),
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
// POST /api/listings/:id/report ← PROTECTED
// ─────────────────────────────────────────────────────────────
const reportListing = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id, 10);
    if (isNaN(listingId))
      return res.status(400).json({ error: "Invalid listing ID" });

    const { reason } = req.body;
    const validReasons = ["SCAM", "FAKE_ITEM", "INAPPROPRIATE_CONTENT", "OTHER"];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: "Invalid report reason" });
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });

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
// GET /api/listings/:id/contact ← PROTECTED
// Reveals the seller's WhatsApp/phone number, gated by token credits.
// 1 token = 4 views, every view counts (no caching of "already viewed").
// ─────────────────────────────────────────────────────────────
const revealContact = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid listing ID" });

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        sellerId: true,
        seller: { select: { whatsapp: true } },
      },
    });

    if (!listing) return res.status(404).json({ error: "Listing not found" });

    return res.status(200).json({ whatsapp: listing.seller.whatsapp });
  } catch (err) {
    console.error("[REVEAL CONTACT ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/listings/:id/favorite ← PROTECTED
// Toggles a favorite on/off for the current user.
// ─────────────────────────────────────────────────────────────
const toggleFavorite = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id, 10);
    if (isNaN(listingId))
      return res.status(400).json({ error: "Invalid listing ID" });

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
      return res.status(200).json({ favorited: false });
    }

    await prisma.favorite.create({
      data: { listingId, userId: req.user.id },
    });
    // Bell-only notification for seller (in-app pull, no email/WA)
    if (listing.sellerId !== req.user.id) {
      try {
        await prisma.notification.create({
          data: { userId: listing.sellerId, actorId: req.user.id, listingId, type: "FAVORITE" },
        });
      } catch (e) {
        console.error("[NOTIFICATION CREATE ERROR]", e.message);
      }
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
  getListingsByUser,
  reportListing,
  revealContact,
  searchListingsByImage,
  toggleFavorite,
  getMyFavoriteIds,
  getMyFavorites,
};
