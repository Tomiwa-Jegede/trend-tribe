// src/controllers/listing.controller.js

const prisma = require("../db");
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

    let usingFreeSlot = activeListingCount < FREE_LISTING_LIMIT;
    let seller = null;

    if (!usingFreeSlot) {
      seller = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { tokenBalance: true },
      });

      if (!seller || seller.tokenBalance < 1) {
        return res.status(403).json({
          error: "You've used all your free listing slots and have no tokens left. Buy tokens to post another listing.",
          limitReached: true,
          currentCount: activeListingCount,
          freeSlotLimit: FREE_LISTING_LIMIT,
          tokenBalance: seller?.tokenBalance ?? 0,
        });
      }
    }

    const listingData = {
      title,
      description,
      price,
      category,
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
            where: { id: req.user.id, tokenBalance: { gte: 1 } },
            data: { tokenBalance: { decrement: 1 } },
          });

          if (updatedSeller.count === 0) {
            throw new Error("TOKEN_BALANCE_RACE");
          }

          return tx.listing.create({ data: listingData, include: listingInclude });
        });

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

    if (!listing.isFreeSlot && listing.editCount >= 2) {
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
  condition,
  images,
  imagePublicIds,
  coverPosition,
  location,
  isAvailable,
} = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (condition !== undefined) updateData.condition = condition;
    if (location !== undefined) updateData.location = location;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
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

    const updated = await prisma.listing.update({
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

    if (listing.sellerId === req.user.id) {
      return res.status(200).json({ whatsapp: listing.seller.whatsapp });
    }

    const { confirmSpend } = req.body;
    const viewer = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { numberViewsRemaining: true, tokenBalance: true },
    });

    if (!viewer) return res.status(401).json({ error: "Account not found." });

    if (viewer.numberViewsRemaining <= 0) {
      if (!confirmSpend) {
        return res.status(402).json({
          needsTokenConfirm: true,
          tokenBalance: viewer.tokenBalance,
          error: viewer.tokenBalance >= 1
            ? "This will use 1 token for 4 number views. Confirm to continue."
            : "You're out of tokens. Buy more to view seller numbers.",
        });
      }

      const spend = await prisma.user.updateMany({
        where: { id: req.user.id, tokenBalance: { gte: 1 } },
        data: { tokenBalance: { decrement: 1 }, numberViewsRemaining: 3 },
      });

      if (spend.count === 0) {
        return res.status(402).json({
          needsTokenConfirm: true,
          tokenBalance: 0,
          error: "You're out of tokens. Buy more to view seller numbers.",
        });
      }
    } else {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { numberViewsRemaining: { decrement: 1 } },
      });
    }

    return res.status(200).json({ whatsapp: listing.seller.whatsapp });
  } catch (err) {
    console.error("[REVEAL CONTACT ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getListingsByUser,
  reportListing,
  revealContact,
};
