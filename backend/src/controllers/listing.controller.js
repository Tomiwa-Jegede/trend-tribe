// src/controllers/listing.controller.js

const prisma = require("../db");

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

  if (!listing) {
    return { error: "Listing not found", status: 404 };
  }

  if (listing.sellerId !== userId) {
    return {
      error: "You are not authorized to modify this listing",
      status: 403,
    };
  }

  return { listing };
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings
// Public — search, filter, paginate
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

    // ── Pagination ─────────────────────────────────────────
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // ── Build WHERE clause ─────────────────────────────────
    const where = { isAvailable: true };

    if (search && search.trim()) {
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

    // ── Build ORDER BY ─────────────────────────────────────
    const orderByMap = {
      newest: { createdAt: "desc" },
      oldest: { createdAt: "asc" },
      price_asc: { price: "asc" },
      price_desc: { price: "desc" },
    };
    const orderBy = orderByMap[sort] || orderByMap.newest;

    // ── Parallel queries ───────────────────────────────────
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
  } catch (error) {
    console.log("🔥 LISTING ERROR:", error);
    return res.status(500).json({
      message: error.message,
      full: error,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings/:id
// Public — single listing with full seller profile
// ─────────────────────────────────────────────────────────────
const getListingById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

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
            listings: {
              where: { isAvailable: true },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const { listings: sellerListings, ...sellerFields } = listing.seller;

    return res.status(200).json({
      listing: {
        ...formatListing(listing),
        seller: {
          ...sellerFields,
          activeListings: sellerListings.length,
        },
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
const createListing = async (req, res) => {
  try {
    const { title, description, price, category, condition, images, location } =
      req.body;

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        price,
        category,
        condition,
        images: images || [],
        location: location || null,
        sellerId: req.user.id,
      },
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
    });

    return res.status(201).json({
      message: "Listing created successfully ✅",
      listing: formatListing(listing),
    });
  } catch (err) {
    console.error("[CREATE LISTING ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/listings/:id ← PROTECTED + OWNER ONLY
// Partial update — only fields sent in body are changed
// ─────────────────────────────────────────────────────────────
const updateListing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    // 1. Check listing exists + caller is the owner
    const { error, status, listing } = await findAndVerifyListing(
      id,
      req.user.id,
    );

    if (error) {
      return res.status(status).json({ error });
    }

    // 2. Build update payload — only include fields that were sent
    const {
      title,
      description,
      price,
      category,
      condition,
      images,
      location,
      isAvailable,
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (condition !== undefined) updateData.condition = condition;
    if (images !== undefined) updateData.images = images;
    if (location !== undefined) updateData.location = location;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    // 3. Reject empty update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "No valid fields provided for update",
      });
    }

    // 4. Perform the update
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

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    // 1. Check listing exists + caller is the owner
    const { error, status } = await findAndVerifyListing(id, req.user.id);

    if (error) {
      return res.status(status).json({ error });
    }

    // 2. Delete the listing
    await prisma.listing.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Listing deleted successfully ✅",
    });
  } catch (err) {
    console.error("[DELETE LISTING ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings/user/:userId
// Public — all listings by a specific user
// Supports ?available=true|false and ?page= ?limit=
// ─────────────────────────────────────────────────────────────
const getListingsByUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // 1. Confirm the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        school: true,
        bio: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Parse query params
    const { available, page = 1, limit = 12, sort = "newest" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // 3. Build WHERE clause
    const where = { sellerId: userId };

    // Optional: filter by availability
    if (available === "true") where.isAvailable = true;
    if (available === "false") where.isAvailable = false;

    // 4. Build ORDER BY
    const orderByMap = {
      newest: { createdAt: "desc" },
      oldest: { createdAt: "asc" },
      price_asc: { price: "asc" },
      price_desc: { price: "desc" },
    };
    const orderBy = orderByMap[sort] || orderByMap.newest;

    // 5. Parallel queries
    const [listings, totalCount] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
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

module.exports = {
  getAllListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getListingsByUser,
};
